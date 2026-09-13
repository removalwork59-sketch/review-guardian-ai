#!/usr/bin/env bash
# Production release on the VPS.
#
#   sudo bash deploy/release.sh            # releases the commit checked out in /var/www/review-guardian-ai
#
# The live app runs from /var/www/review-guardian-ai/.output. Building there would swap files under
# the running server (it loads code lazily), so every release is built in a separate checkout
# (/var/www/review-guardian-ai-build), tested and checked there, and only then swapped in.
# Runtime configuration lives in /etc/review-guardian-ai.env (root-only). Secret values are never
# printed.
set -euo pipefail

APP=/var/www/review-guardian-ai
BUILD=/var/www/review-guardian-ai-build
ENV_FILE=/etc/review-guardian-ai.env
SERVICE=review-guardian-ai.service

COMMIT=$(git -C "$APP" rev-parse HEAD)
SHORT=$(git -C "$APP" rev-parse --short HEAD)
echo "== releasing $SHORT: $(git -C "$APP" log -1 --format=%s)"
[ -z "$(git -C "$APP" status --porcelain)" ] || { echo "ABORT: $APP has uncommitted changes"; exit 1; }

# --- build checkout ---------------------------------------------------------------------------
[ -d "$BUILD/.git" ] || git clone -q "$APP" "$BUILD"
git -C "$BUILD" fetch -q "$APP" "$COMMIT"
git -C "$BUILD" checkout -q -f "$COMMIT"
git -C "$BUILD" clean -qfd -e node_modules
cd "$BUILD"
rm -f .env # the tracked Lovable .env must never reach a production build

npm install --no-audit --no-fund >/tmp/rw-install.log 2>&1 || { tail -20 /tmp/rw-install.log; exit 1; }

echo "== unit tests"
npx vitest run --reporter=dot

echo "== build"
rm -rf .output
( set -a; . "$ENV_FILE"; set +a; NITRO_PRESET=node-server npx vite build >/tmp/rw-build.log 2>&1 ) \
  || { echo "ABORT: build failed"; tail -30 /tmp/rw-build.log; exit 1; }

echo "== typecheck"
npx tsc --noEmit

echo "== bundle checks"
if grep -rqE "ai\.gateway\.lovable\.dev|connector-gateway\.lovable\.dev" .output; then
  echo "ABORT: the build references Lovable gateways"; exit 1
fi
EXPECTED_REF=$(grep -E '^SUPABASE_URL=' "$ENV_FILE" | sed -E 's#^SUPABASE_URL=https://([a-z0-9]+)\..*#\1#')
grep -rq "$EXPECTED_REF" .output/public || { echo "ABORT: the build does not target the configured Supabase project"; exit 1; }

# --- swap in and verify -------------------------------------------------------------------------
echo "== switch"
rm -rf "$APP/.output.next" "$APP/.output.previous"
cp -a "$BUILD/.output" "$APP/.output.next"
[ -d "$APP/.output" ] && mv "$APP/.output" "$APP/.output.previous"
mv "$APP/.output.next" "$APP/.output"
sed -i -E "/^(APP_COMMIT|APP_BUILD_ID)=/d" "$ENV_FILE"
printf 'APP_COMMIT=%s\nAPP_BUILD_ID=%s\n' "$SHORT" "REMOVALWORK-$(date -u +%Y%m%d%H%M)" >> "$ENV_FILE"
systemctl restart "$SERVICE"

healthy=""
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/public/version 2>/dev/null | grep -q "\"commit\":\"$SHORT\""; then
    healthy=1
    break
  fi
  sleep 1
done

if [ -z "$healthy" ]; then
  echo "HEALTH CHECK FAILED - rolling back to the previous build"
  if [ -d "$APP/.output.previous" ]; then
    rm -rf "$APP/.output"
    mv "$APP/.output.previous" "$APP/.output"
  fi
  systemctl restart "$SERVICE"
  exit 1
fi

echo "== live:   $(curl -fsS http://127.0.0.1:3000/api/public/version)"
echo "== health: $(curl -sS http://127.0.0.1:3000/api/public/health)"
