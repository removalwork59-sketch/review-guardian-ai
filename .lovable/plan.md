# Backend-first old project integration

## Goal
Keep the current Removal Work UI, branding, navigation, and user flow unchanged while absorbing only stronger production functionality from the old repository. The finished flow remains:

```text
Add review → search/fetch → AI policy analysis → evidence → report preparation → status/outcome tracking
```

## Audit findings and decisions

| Capability | Priority | Decision | Integration approach |
|---|---:|---|---|
| Current Google Maps link lookup and review scan | P0 | KEEP + HARDEN | Preserve the current connector-based lookup and current UI. Improve URL validation, review identity, error detail, and deduplication from the old implementation. |
| Google Business Profile OAuth, managed locations, and full review sync | P0 | ADAPT | Port the official OAuth/account/location/review-read flow behind authenticated server functions. Encrypt/protect tokens, remove hardcoded secret fallbacks, verify workspace ownership, and use current app routes/UI patterns. |
| Durable review records | P0 | ADAPT | Add a normalized reviews layer compatible with existing `review_cases`; do not copy conflicting old tables or enums wholesale. Preserve existing customer data. |
| AI policy analysis | P0 | KEEP + REWRITE | Preserve the current secure server-side AI path and structured output. Expand it into extraction → classification → evidence/counter-evidence → self-critique → second opinion when needed → final decision → report draft. Use bounded retries only for rate limits/server failures and surface real provider errors. |
| Evidence and report preparation | P0 | ADAPT | Port case evidence, notes, event history, report drafts, and appeal records into the current case model. Never claim submission/removal unless an authorized user records a real action or Google data proves disappearance. |
| Case status and audit trail | P0 | ADAPT | Keep current statuses and add append-only events/timestamps for report, appeal, rejection, resolution, and notes. Avoid the old incompatible enum and duplicate case table. |
| Persisted bulk jobs | P1 | ADAPT | Replace browser-only batch lifetime with durable batches/items, safe claims/leases, resume, cancel, retry of transient failures, deduplication, and per-URL progress while retaining the current Bulk screen. |
| Scheduled Google sync/reconciliation | P1 | REWRITE | Add authenticated/secret-verified public cron endpoints with idempotent jobs and bounded processing. Reconciliation may detect that a previously synced review is absent, but must label that as observed absence—not proof Google approved a report. |
| Workspaces/business membership | P1 | ADAPT LATER | Introduce only the minimum ownership layer needed for multiple businesses/locations. Reconcile it with current `superadmin/admin/user` roles; never copy old `admin/manager/analyst` roles or broad role visibility. |
| Notifications | P2 | ADAPT | Generate database notifications only from real status changes, failures, completed scans, and observed outcomes. No simulated alerts. |
| Reporting/analytics database functions and indexes | P2 | ADAPT | Port useful aggregate-query and indexing ideas after schema integration, scoped to the current ownership model and real data. |
| Attachments/storage evidence | P2 | ADAPT LATER | Add only after evidence/report records are stable, with owner-scoped storage policies. Do not copy migrations that modify managed storage schemas. |
| Old UI, landing pages, sidebar, components, colors, assets, and animations | P3 | IGNORE | Import nothing visual. |

## Safety corrections required before reuse

- Remove the old OAuth-state fallback secret and require a securely managed signing secret.
- Do not copy service-role access patterns into ordinary authenticated reads/writes; use user-scoped clients and row-level security.
- Do not copy old migrations directly. Create additive migrations against the current live schema with grants, indexes, foreign keys, and owner-scoped policies.
- Do not expose Google access or refresh tokens to the browser or broadly readable tables.
- Do not treat Places API sample reviews as a guaranteed match for a pasted individual review URL.
- Do not claim Google report submission/status APIs that do not exist. Preserve manual handoff and honest status labels.
- Do not retry terminal AI/auth/validation failures. Retry only rate limits and temporary upstream failures with bounded backoff.

## Implementation sequence

### Phase 1 — P0 data foundation and review identity
- Inspect the live database before migration and map existing rows/constraints.
- Add additive review, case-event, report-draft, and appeal structures linked to current users, locations, and cases.
- Add canonical URL/source identifiers, unique constraints, dedupe keys, timestamps, indexes, grants, and strict row-level policies.
- Extend current server functions rather than creating duplicate scan/case APIs.

### Phase 2 — P0 hardened scan and AI decision pipeline
- Improve Google URL normalization and precise place/review matching while preserving current connector access.
- Persist every successful real fetch before analysis and make rescans idempotent.
- Add structured multi-stage AI analysis with evidence, counter-evidence, critique, calibrated confidence, final decision, and report draft.
- Preserve input on failures and expose actionable provider/Google errors without fake fallback output.

### Phase 3 — P0 reporting and real status tracking
- Add append-only case events, notes, report preparation, manual submission timestamps, appeal history, and outcome timestamps.
- Adapt these capabilities into existing Reviews and Reports screens without changing their design language.
- Keep status transitions validated server-side and scoped to the authenticated owner/workspace.

### Phase 4 — P1 official Google Business Profile connection
- Add secure OAuth state, callback, token refresh/revocation, account/location discovery, location linking, and paginated review sync.
- Require the official Google APIs and permissions; show setup/access/quota failures accurately.
- Add idempotent scheduled sync and observed-absence reconciliation only after real credentials and API approval are confirmed.

### Phase 5 — P1 durable bulk processing
- Add persisted batch and item records, canonical dedupe, atomic claims/leases, stale-job recovery, cancellation, resume, and transient-only retry.
- Process safe parallel work with controlled concurrency; serialize provider-constrained operations.
- Keep the current Bulk interface and bind it to real persisted progress.

### Phase 6 — P2 optimization and operational visibility
- Add query indexes/aggregates, notifications, audit visibility, and measured caching where real traffic shows benefit.
- Add attachment storage only with owner-scoped policies and after the core reporting flow is verified.

## Verification gates

For each phase:
- Run migration/schema security checks and verify every new table has explicit grants and row-level policies.
- Test as two different users to prove tenant isolation and role enforcement.
- Test real Google URLs: valid direct URL, short URL, duplicate URL, unavailable review, wrong platform, quota/access error, and second real review.
- Invoke the real AI path and validate structured output, policy evidence, no-violation decisions, terminal errors, and retryable errors.
- Test report/status/appeal transitions and confirm every visible success corresponds to persisted real data.
- Test bulk duplicate handling, interruption/resume, cancel, stale lease recovery, and partial failure.
- Run lint/build, inspect server/runtime/network logs, and perform desktop/tablet/mobile regression checks across current screens.

## Configuration boundaries

- Reuse current Lovable Cloud, authentication, Google connector, and AI infrastructure first.
- Add Google Business Profile OAuth credentials or a secure signing secret only when the relevant phase needs them and only through secure project settings.
- Never print, copy, or commit secrets from either repository.
- No production backend target will change without first verifying the live configuration.
