-- Removal Work (review-guardian-ai) schema, merged additively into the live production project.
--
-- The production database already holds the previous OrbitRep app's tables. This migration never
-- drops, renames or rewrites an existing table. Where the new app's table names collide with
-- existing tables that have a different shape, the new app uses its own names:
--   locations   -> review_locations
--   case_events -> review_case_events
-- profiles and user_roles are shared (one auth system): existing tables gain columns / enum values.
-- Every statement is idempotent so the migration can be re-run safely.

-- ---------------------------------------------------------------------------------------------
-- Shared auth tables
-- ---------------------------------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'display_name', auth.jwt() -> 'user_metadata' ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT * INTO result FROM public.profiles WHERE id = auth.uid();
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Locations and cases
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'google',
  place_id text NOT NULL,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  maps_uri text NOT NULL DEFAULT '',
  rating numeric,
  rating_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_locations_user_place_unique UNIQUE (user_id, place_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_locations TO authenticated;
GRANT ALL ON public.review_locations TO service_role;
ALTER TABLE public.review_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own review locations" ON public.review_locations;
CREATE POLICY "Users read own review locations" ON public.review_locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own review locations" ON public.review_locations;
CREATE POLICY "Users insert own review locations" ON public.review_locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own review locations" ON public.review_locations;
CREATE POLICY "Users update own review locations" ON public.review_locations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own review locations" ON public.review_locations;
CREATE POLICY "Users delete own review locations" ON public.review_locations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS review_locations_touch ON public.review_locations;
CREATE TRIGGER review_locations_touch BEFORE UPDATE ON public.review_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.review_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.review_locations(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'google',
  source_url text NOT NULL DEFAULT '',
  review_external_id text NOT NULL,
  review_url text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  review_rating numeric,
  review_text text NOT NULL DEFAULT '',
  review_relative_time text NOT NULL DEFAULT '',
  verdict text NOT NULL,
  violation_category text NOT NULL DEFAULT 'none',
  headline text NOT NULL DEFAULT '',
  plain_summary text NOT NULL DEFAULT '',
  confidence integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'low',
  rejection_risk text NOT NULL DEFAULT 'low',
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  status_note text NOT NULL DEFAULT '',
  reported_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_cases_user_external_unique UNIQUE (user_id, review_external_id)
);
CREATE INDEX IF NOT EXISTS review_cases_user_created_idx ON public.review_cases (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_cases_location_idx ON public.review_cases (location_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_cases TO authenticated;
GRANT ALL ON public.review_cases TO service_role;
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own cases" ON public.review_cases;
CREATE POLICY "Users read own cases" ON public.review_cases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own cases" ON public.review_cases;
CREATE POLICY "Users insert own cases" ON public.review_cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own cases" ON public.review_cases;
CREATE POLICY "Users update own cases" ON public.review_cases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own cases" ON public.review_cases;
CREATE POLICY "Users delete own cases" ON public.review_cases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS review_cases_touch ON public.review_cases;
CREATE TRIGGER review_cases_touch BEFORE UPDATE ON public.review_cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Review records, events, reports, appeals
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.review_locations(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'google',
  external_id text NOT NULL,
  canonical_source_url text NOT NULL DEFAULT '',
  review_url text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  author_photo_url text NOT NULL DEFAULT '',
  rating numeric,
  review_text text NOT NULL DEFAULT '',
  relative_time text NOT NULL DEFAULT '',
  published_at timestamptz,
  content_fingerprint text NOT NULL,
  raw_source jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  observed_absent_at timestamptz,
  identity_status text NOT NULL DEFAULT 'provider_observed',
  identity_method text NOT NULL DEFAULT 'provider_sample',
  identity_confidence integer NOT NULL DEFAULT 50,
  requested_source_url text NOT NULL DEFAULT '',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_records_user_platform_external_unique UNIQUE (user_id, platform, external_id),
  CONSTRAINT review_records_user_fingerprint_unique UNIQUE (user_id, platform, content_fingerprint),
  CONSTRAINT review_records_identity_status_check CHECK (identity_status IN ('provider_observed','exact_url_match','user_selected','official_sync_verified','unverified')),
  CONSTRAINT review_records_identity_confidence_check CHECK (identity_confidence BETWEEN 0 AND 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_records TO authenticated;
GRANT ALL ON public.review_records TO service_role;
ALTER TABLE public.review_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own review records" ON public.review_records;
CREATE POLICY "Users read own review records" ON public.review_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own review records" ON public.review_records;
CREATE POLICY "Users insert own review records" ON public.review_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own review records" ON public.review_records;
CREATE POLICY "Users update own review records" ON public.review_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own review records" ON public.review_records;
CREATE POLICY "Users delete own review records" ON public.review_records FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS review_records_user_location_idx ON public.review_records(user_id, location_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS review_records_user_last_seen_idx ON public.review_records(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS review_records_user_identity_idx ON public.review_records(user_id, identity_status, last_seen_at DESC);
DROP TRIGGER IF EXISTS review_records_touch ON public.review_records;
CREATE TRIGGER review_records_touch BEFORE UPDATE ON public.review_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.review_cases
  ADD COLUMN IF NOT EXISTS review_record_id uuid REFERENCES public.review_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canonical_source_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS analysis_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS appealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_round integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS review_cases_user_status_created_idx ON public.review_cases(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS review_cases_review_record_idx ON public.review_cases(review_record_id);

CREATE TABLE IF NOT EXISTS public.review_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.review_case_events TO authenticated;
GRANT ALL ON public.review_case_events TO service_role;
ALTER TABLE public.review_case_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own review case events" ON public.review_case_events;
CREATE POLICY "Users read own review case events" ON public.review_case_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own review case events" ON public.review_case_events;
CREATE POLICY "Users insert own review case events" ON public.review_case_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS review_case_events_user_case_created_idx ON public.review_case_events(user_id, case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  report_reason text NOT NULL DEFAULT '',
  report_body text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  counter_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_drafts_case_version_unique UNIQUE(case_id, version),
  CONSTRAINT report_drafts_status_check CHECK (status IN ('draft','ready','submitted','superseded'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_drafts TO authenticated;
GRANT ALL ON public.report_drafts TO service_role;
ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own report drafts" ON public.report_drafts;
CREATE POLICY "Users read own report drafts" ON public.report_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own report drafts" ON public.report_drafts;
CREATE POLICY "Users insert own report drafts" ON public.report_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own report drafts" ON public.report_drafts;
CREATE POLICY "Users update own report drafts" ON public.report_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own report drafts" ON public.report_drafts;
CREATE POLICY "Users delete own report drafts" ON public.report_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS report_drafts_user_status_idx ON public.report_drafts(user_id, status, updated_at DESC);
DROP TRIGGER IF EXISTS report_drafts_touch ON public.report_drafts;
CREATE TRIGGER report_drafts_touch BEFORE UPDATE ON public.report_drafts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.case_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  round integer NOT NULL,
  reason text NOT NULL,
  supporting_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_reference text,
  status text NOT NULL DEFAULT 'prepared',
  submitted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_appeals_case_round_unique UNIQUE(case_id, round),
  CONSTRAINT case_appeals_status_check CHECK (status IN ('prepared','submitted','accepted','rejected','withdrawn'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_appeals TO authenticated;
GRANT ALL ON public.case_appeals TO service_role;
ALTER TABLE public.case_appeals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own case appeals" ON public.case_appeals;
CREATE POLICY "Users read own case appeals" ON public.case_appeals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own case appeals" ON public.case_appeals;
CREATE POLICY "Users insert own case appeals" ON public.case_appeals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own case appeals" ON public.case_appeals;
CREATE POLICY "Users update own case appeals" ON public.case_appeals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own case appeals" ON public.case_appeals;
CREATE POLICY "Users delete own case appeals" ON public.case_appeals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS case_appeals_user_case_idx ON public.case_appeals(user_id, case_id, round DESC);
DROP TRIGGER IF EXISTS case_appeals_touch ON public.case_appeals;
CREATE TRIGGER case_appeals_touch BEFORE UPDATE ON public.case_appeals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.record_review_case_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.review_case_events(user_id, case_id, event_type, message, metadata)
    VALUES (NEW.user_id, NEW.id, 'case_created', 'Case created', jsonb_build_object('status', NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.review_case_events(user_id, case_id, event_type, message, metadata)
    VALUES (NEW.user_id, NEW.id, 'status_changed', COALESCE(NEW.status_note, ''), jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS review_cases_status_event ON public.review_cases;
CREATE TRIGGER review_cases_status_event AFTER INSERT OR UPDATE OF status ON public.review_cases
  FOR EACH ROW EXECUTE FUNCTION public.record_review_case_status_event();

-- ---------------------------------------------------------------------------------------------
-- AI audit
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  review_record_id uuid REFERENCES public.review_records(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.review_cases(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  policy_version text NOT NULL,
  input_hash text NOT NULL,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence integer,
  duration_ms integer NOT NULL DEFAULT 0,
  gateway_run_id text,
  status text NOT NULL DEFAULT 'completed',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_runs_status_check CHECK (status IN ('completed','failed')),
  CONSTRAINT ai_runs_confidence_check CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  CONSTRAINT ai_runs_duration_check CHECK (duration_ms >= 0)
);
GRANT SELECT, INSERT ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own AI runs" ON public.ai_runs;
CREATE POLICY "Users read own AI runs" ON public.ai_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own AI runs" ON public.ai_runs;
CREATE POLICY "Users insert own AI runs" ON public.ai_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS ai_runs_user_created_idx ON public.ai_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_review_idx ON public.ai_runs(review_record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_case_idx ON public.ai_runs(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_input_hash_idx ON public.ai_runs(user_id, input_hash, prompt_version, created_at DESC);

-- ---------------------------------------------------------------------------------------------
-- Durable bulk queue
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  total_items integer NOT NULL DEFAULT 0,
  queued_count integer NOT NULL DEFAULT 0,
  discovering_count integer NOT NULL DEFAULT 0,
  identified_count integer NOT NULL DEFAULT 0,
  analyzing_count integer NOT NULL DEFAULT 0,
  report_ready_count integer NOT NULL DEFAULT 0,
  needs_review_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  pause_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_jobs_status_check CHECK (status IN ('queued','running','paused','completed','cancelled')),
  CONSTRAINT bulk_jobs_counts_nonnegative CHECK (total_items >= 0 AND queued_count >= 0 AND discovering_count >= 0 AND identified_count >= 0 AND analyzing_count >= 0 AND report_ready_count >= 0 AND needs_review_count >= 0 AND failed_count >= 0)
);
GRANT SELECT, INSERT, UPDATE ON public.bulk_jobs TO authenticated;
GRANT ALL ON public.bulk_jobs TO service_role;
ALTER TABLE public.bulk_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own bulk jobs" ON public.bulk_jobs;
CREATE POLICY "Users read own bulk jobs" ON public.bulk_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own bulk jobs" ON public.bulk_jobs;
CREATE POLICY "Users insert own bulk jobs" ON public.bulk_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own bulk jobs" ON public.bulk_jobs;
CREATE POLICY "Users update own bulk jobs" ON public.bulk_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS bulk_jobs_user_created_idx ON public.bulk_jobs(user_id, created_at DESC);
DROP TRIGGER IF EXISTS bulk_jobs_touch ON public.bulk_jobs;
CREATE TRIGGER bulk_jobs_touch BEFORE UPDATE ON public.bulk_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.bulk_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_url text NOT NULL,
  canonical_source_url text NOT NULL,
  source_kind text NOT NULL DEFAULT 'review',
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  lease_token uuid,
  lease_expires_at timestamptz,
  review_record_id uuid REFERENCES public.review_records(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.review_cases(id) ON DELETE SET NULL,
  business_name text,
  detail text NOT NULL DEFAULT 'Waiting',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_job_items_job_url_unique UNIQUE(job_id, canonical_source_url),
  CONSTRAINT bulk_job_items_status_check CHECK (status IN ('queued','discovering','identified','analyzing','report_ready','needs_review','failed','cancelled')),
  CONSTRAINT bulk_job_items_source_kind_check CHECK (source_kind IN ('review','business','competitor')),
  CONSTRAINT bulk_job_items_attempt_count_check CHECK (attempt_count BETWEEN 0 AND 5)
);
GRANT SELECT, INSERT, UPDATE ON public.bulk_job_items TO authenticated;
GRANT ALL ON public.bulk_job_items TO service_role;
ALTER TABLE public.bulk_job_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own bulk items" ON public.bulk_job_items;
CREATE POLICY "Users read own bulk items" ON public.bulk_job_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own bulk items" ON public.bulk_job_items;
CREATE POLICY "Users insert own bulk items" ON public.bulk_job_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own bulk items" ON public.bulk_job_items;
CREATE POLICY "Users update own bulk items" ON public.bulk_job_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS bulk_job_items_claim_idx ON public.bulk_job_items(job_id, status, lease_expires_at, created_at);
CREATE INDEX IF NOT EXISTS bulk_job_items_user_status_idx ON public.bulk_job_items(user_id, status, updated_at DESC);
DROP TRIGGER IF EXISTS bulk_job_items_touch ON public.bulk_job_items;
CREATE TRIGGER bulk_job_items_touch BEFORE UPDATE ON public.bulk_job_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_bulk_job_counts(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.bulk_jobs WHERE id = _job_id;
  IF _owner IS NULL OR (_owner <> auth.uid() AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.bulk_jobs j SET
    total_items = counts.total,
    queued_count = counts.queued,
    discovering_count = counts.discovering,
    identified_count = counts.identified,
    analyzing_count = counts.analyzing,
    report_ready_count = counts.report_ready,
    needs_review_count = counts.needs_review,
    failed_count = counts.failed,
    status = CASE
      WHEN j.status IN ('paused','cancelled') THEN j.status
      WHEN counts.total > 0 AND counts.terminal = counts.total THEN 'completed'
      WHEN counts.active > 0 OR counts.terminal > 0 THEN 'running'
      ELSE 'queued'
    END,
    started_at = CASE WHEN counts.active > 0 OR counts.terminal > 0 THEN COALESCE(j.started_at, now()) ELSE j.started_at END,
    completed_at = CASE WHEN counts.total > 0 AND counts.terminal = counts.total THEN COALESCE(j.completed_at, now()) ELSE NULL END
  FROM (
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE status = 'queued')::integer AS queued,
      count(*) FILTER (WHERE status = 'discovering')::integer AS discovering,
      count(*) FILTER (WHERE status = 'identified')::integer AS identified,
      count(*) FILTER (WHERE status = 'analyzing')::integer AS analyzing,
      count(*) FILTER (WHERE status = 'report_ready')::integer AS report_ready,
      count(*) FILTER (WHERE status = 'needs_review')::integer AS needs_review,
      count(*) FILTER (WHERE status = 'failed')::integer AS failed,
      count(*) FILTER (WHERE status IN ('discovering','identified','analyzing'))::integer AS active,
      count(*) FILTER (WHERE status IN ('report_ready','needs_review','failed','cancelled'))::integer AS terminal
    FROM public.bulk_job_items
    WHERE job_id = _job_id
  ) counts
  WHERE j.id = _job_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_bulk_job_counts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_bulk_job_item(_job_id uuid, _lease_seconds integer DEFAULT 300)
RETURNS SETOF public.bulk_job_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _item_id uuid;
  _token uuid := gen_random_uuid();
BEGIN
  SELECT user_id INTO _owner FROM public.bulk_jobs WHERE id = _job_id AND status <> 'paused' AND status <> 'cancelled';
  IF _owner IS NULL OR (_owner <> auth.uid() AND auth.role() <> 'service_role') THEN
    RETURN;
  END IF;

  SELECT id INTO _item_id
  FROM public.bulk_job_items
  WHERE job_id = _job_id
    AND (status = 'queued' OR (status = 'discovering' AND lease_expires_at < now()))
    AND attempt_count < 5
  ORDER BY created_at, id
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF _item_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  UPDATE public.bulk_job_items
  SET status = 'discovering', lease_token = _token,
      lease_expires_at = now() + make_interval(secs => LEAST(GREATEST(_lease_seconds, 30), 900)),
      attempt_count = attempt_count + 1,
      started_at = COALESCE(started_at, now()), detail = 'Finding the business and exact review'
  WHERE id = _item_id
  RETURNING *;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_bulk_job_item(uuid, integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Google Business Profile OAuth (encrypted tokens, one-time PKCE state)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_business_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  google_account_email text,
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'connected',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_business_connections_status_check CHECK (status IN ('connected','reauthorization_required','revoked'))
);
GRANT SELECT, DELETE ON public.google_business_connections TO authenticated;
GRANT ALL ON public.google_business_connections TO service_role;
ALTER TABLE public.google_business_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own Google Business connection" ON public.google_business_connections;
CREATE POLICY "Users read own Google Business connection" ON public.google_business_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own Google Business connection" ON public.google_business_connections;
CREATE POLICY "Users delete own Google Business connection" ON public.google_business_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS google_business_connections_touch ON public.google_business_connections;
CREATE TRIGGER google_business_connections_touch BEFORE UPDATE ON public.google_business_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  state_hash text NOT NULL UNIQUE,
  code_verifier_ciphertext text NOT NULL,
  redirect_origin text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.google_oauth_states TO authenticated;
GRANT ALL ON public.google_oauth_states TO service_role;
ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create own Google OAuth state" ON public.google_oauth_states;
CREATE POLICY "Users create own Google OAuth state" ON public.google_oauth_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS google_oauth_states_expiry_idx ON public.google_oauth_states(expires_at) WHERE used_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_google_oauth_state(_state_hash text)
RETURNS SETOF public.google_oauth_states
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.google_oauth_states
  SET used_at = now()
  WHERE state_hash = _state_hash
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_google_oauth_state(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_google_oauth_state(text) TO service_role;
