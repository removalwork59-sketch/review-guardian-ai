-- =============================================================================================
-- Removal Work — production schema
--
-- Applies to the live Supabase project that still holds the retired OrbitRep app's tables, and
-- also to a fresh database. It is purely additive for existing data:
--   * no existing table is dropped, renamed or rewritten;
--   * shared identity tables (profiles, user_roles, notifications) gain columns instead of being
--     duplicated;
--   * legacy workspaces (businesses / business_members) are copied 1:1 into workspaces /
--     workspace_members with the same ids, so every existing member keeps their access;
--   * the legacy "any signed-in user can read every profile and role" policies are tightened.
-- Every statement is idempotent, so the migration can be re-run.
-- Rollback: supabase/rollback/20260913200000_removal_work_schema.down.sql
-- =============================================================================================

-- ---------------------------------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------------------------
-- 1. Identity: profiles, platform roles (shared with the legacy app — extended, not duplicated)
-- ---------------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');
  END IF;
END $$;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles (user_id);

-- Platform super admin. Compared as text so the new enum value is usable in the same transaction.
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'superadmin'
  )
$$;
REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- 2. Workspaces (tenant boundary)
-- ---------------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
    CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON public.workspace_members (user_id, workspace_id);
DROP TRIGGER IF EXISTS workspaces_touch ON public.workspaces;
CREATE TRIGGER workspaces_touch BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.workspace_role_rank(_role text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _role WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'member' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    JOIN public.workspaces w ON w.id = m.workspace_id AND w.deleted_at IS NULL
    WHERE m.workspace_id = _workspace_id AND m.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _minimum text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    JOIN public.workspaces w ON w.id = m.workspace_id AND w.deleted_at IS NULL
    WHERE m.workspace_id = _workspace_id
      AND m.user_id = auth.uid()
      AND public.workspace_role_rank(m.role::text) >= public.workspace_role_rank(_minimum)
  )
$$;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid), public.has_workspace_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid), public.has_workspace_role(uuid, text) TO authenticated, service_role;

GRANT SELECT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspaces, public.workspace_members TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read their workspaces" ON public.workspaces;
CREATE POLICY "Members read their workspaces" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id) OR public.is_superadmin());
DROP POLICY IF EXISTS "Owners update their workspaces" ON public.workspaces;
CREATE POLICY "Owners update their workspaces" ON public.workspaces FOR UPDATE TO authenticated
  USING (public.has_workspace_role(id, 'owner')) WITH CHECK (public.has_workspace_role(id, 'owner'));
DROP POLICY IF EXISTS "Members read workspace membership" ON public.workspace_members;
CREATE POLICY "Members read workspace membership" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR public.is_superadmin());

-- Copy legacy OrbitRep workspaces 1:1 (same ids) so existing members keep their access.
DO $$ BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.workspaces (id, name, created_by, created_at)
      SELECT b.id, b.name, b.owner_id, b.created_at FROM public.businesses b
      ON CONFLICT (id) DO NOTHING
    $sql$;
    EXECUTE $sql$
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      SELECT b.id, b.owner_id, 'owner'::public.workspace_role FROM public.businesses b
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    $sql$;
  END IF;
  IF to_regclass('public.business_members') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      SELECT m.business_id, m.user_id,
             CASE m.role::text WHEN 'admin' THEN 'admin' WHEN 'manager' THEN 'admin' ELSE 'member' END::public.workspace_role
      FROM public.business_members m
      JOIN public.workspaces w ON w.id = m.business_id
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    $sql$;
  END IF;
END $$;

-- Tighten legacy identity policies: no more reading every user's profile or role.
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by self, colleagues and superadmin" ON public.profiles;
CREATE POLICY "Profiles readable by self, colleagues and superadmin" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members mine
      JOIN public.workspace_members theirs ON theirs.workspace_id = mine.workspace_id
      WHERE mine.user_id = auth.uid() AND theirs.user_id = profiles.id
    )
  );
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Users create own profile" ON public.profiles;
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_write_own" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin());

-- Profile + personal workspace bootstrap for the signed-in user.
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

  SELECT * INTO result FROM public.profiles WHERE id = auth.uid();
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_my_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace uuid;
  _name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT m.workspace_id INTO _workspace
  FROM public.workspace_members m
  JOIN public.workspaces w ON w.id = m.workspace_id AND w.deleted_at IS NULL
  WHERE m.user_id = auth.uid()
  ORDER BY public.workspace_role_rank(m.role::text) DESC, m.created_at
  LIMIT 1;
  IF _workspace IS NOT NULL THEN
    RETURN _workspace;
  END IF;

  _name := COALESCE(NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), split_part(COALESCE(auth.jwt() ->> 'email', 'My'), '@', 1)) || ' workspace';
  INSERT INTO public.workspaces (name, created_by) VALUES (_name, auth.uid()) RETURNING id INTO _workspace;
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_workspace, auth.uid(), 'owner');
  RETURN _workspace;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_my_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_workspace() TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Versioned policy registry
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  official_source text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT policy_versions_platform_version_unique UNIQUE (platform, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS policy_versions_one_active_per_platform ON public.policy_versions (platform) WHERE active;

CREATE TABLE IF NOT EXISTS public.policy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id uuid NOT NULL REFERENCES public.policy_versions(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  reportable boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT policy_categories_version_key_unique UNIQUE (policy_version_id, key)
);
GRANT SELECT ON public.policy_versions, public.policy_categories TO authenticated;
GRANT ALL ON public.policy_versions, public.policy_categories TO service_role;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Policies are readable by signed-in users" ON public.policy_versions;
CREATE POLICY "Policies are readable by signed-in users" ON public.policy_versions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Policy categories are readable by signed-in users" ON public.policy_categories;
CREATE POLICY "Policy categories are readable by signed-in users" ON public.policy_categories FOR SELECT TO authenticated USING (true);

-- The categories the AI classifies against. last_verified_at stays NULL until an admin confirms
-- the wording against the official source.
INSERT INTO public.policy_versions (platform, version, title, official_source, active)
VALUES ('google', 'google-content-policy-2026-09', 'Google Maps user-contributed content policy',
        'https://support.google.com/contributionpolicy/answer/7400114', true)
ON CONFLICT (platform, version) DO NOTHING;

INSERT INTO public.policy_categories (policy_version_id, key, label, description, reportable)
SELECT v.id, c.key, c.label, c.description, c.reportable
FROM public.policy_versions v
CROSS JOIN (VALUES
  ('none', 'No violation', 'Negative or critical content that stays within the rules.', false),
  ('spam_or_advertising', 'Spam or advertising', 'Promotional content, links, repeated or bot-like posting.', true),
  ('fake_or_no_real_experience', 'Fake or no real experience', 'Content that does not reflect a genuine experience with the place.', true),
  ('conflict_of_interest', 'Conflict of interest', 'Content from owners, employees, competitors or paid reviewers.', true),
  ('off_topic', 'Off-topic', 'Content not about the experience at this place.', true),
  ('harassment_or_hate', 'Harassment or hate', 'Personal attacks, threats, or content attacking protected groups.', true),
  ('personal_information', 'Personal information', 'Private details such as phone numbers, addresses or health data of individuals.', true),
  ('profanity_or_obscenity', 'Profanity or obscenity', 'Obscene, profane or sexually explicit language.', true),
  ('impersonation', 'Impersonation', 'Pretending to be another person or organisation.', true),
  ('illegal_or_dangerous', 'Illegal or dangerous', 'Content promoting illegal activity or dangerous acts.', true)
) AS c(key, label, description, reportable)
WHERE v.platform = 'google' AND v.version = 'google-content-policy-2026-09'
ON CONFLICT (policy_version_id, key) DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- 4. Businesses/locations and reviews (workspace-scoped)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'google',
  place_id text NOT NULL,
  business_profile_location text,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  maps_uri text NOT NULL DEFAULT '',
  rating numeric,
  rating_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_locations_workspace_place_unique UNIQUE (workspace_id, platform, place_id)
);
CREATE INDEX IF NOT EXISTS review_locations_workspace_created_idx ON public.review_locations (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.review_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.review_locations(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'google',
  source text NOT NULL,
  external_id text NOT NULL,
  review_url text NOT NULL DEFAULT '',
  canonical_source_url text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  author_photo_url text NOT NULL DEFAULT '',
  rating numeric,
  review_text text NOT NULL DEFAULT '',
  published_at timestamptz,
  content_fingerprint text NOT NULL,
  identity_status text NOT NULL,
  identity_method text NOT NULL,
  identity_confidence integer NOT NULL,
  verified_at timestamptz,
  raw_source jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  observed_absent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_records_workspace_external_unique UNIQUE (workspace_id, platform, external_id),
  CONSTRAINT review_records_source_check CHECK (source IN ('google_business_profile', 'google_places')),
  CONSTRAINT review_records_identity_status_check CHECK (identity_status IN ('provider_observed', 'exact_url_match', 'official_sync_verified', 'user_selected', 'unverified')),
  CONSTRAINT review_records_identity_confidence_check CHECK (identity_confidence BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS review_records_workspace_location_idx ON public.review_records (workspace_id, location_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS review_records_fingerprint_idx ON public.review_records (workspace_id, content_fingerprint);

-- ---------------------------------------------------------------------------------------------
-- 5. Review processing jobs (single review pipeline state machine)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  idempotency_key text NOT NULL,
  source_url text NOT NULL,
  canonical_url text NOT NULL,
  platform text,
  status text NOT NULL DEFAULT 'queued',
  detail text NOT NULL DEFAULT '',
  location_id uuid REFERENCES public.review_locations(id) ON DELETE SET NULL,
  review_record_id uuid REFERENCES public.review_records(id) ON DELETE SET NULL,
  case_id uuid,
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  business jsonb,
  limitation text,
  error_code text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_jobs_idempotency_unique UNIQUE (workspace_id, idempotency_key),
  CONSTRAINT review_jobs_status_check CHECK (status IN (
    'queued', 'discovering', 'awaiting_selection', 'identified', 'fetching', 'analyzing',
    'evidence_ready', 'report_ready', 'needs_human_review', 'completed', 'failed', 'cancelled')),
  CONSTRAINT review_jobs_attempts_check CHECK (attempt_count BETWEEN 0 AND 10)
);
CREATE INDEX IF NOT EXISTS review_jobs_workspace_created_idx ON public.review_jobs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_jobs_claim_idx ON public.review_jobs (status, next_attempt_at, lease_expires_at);

CREATE TABLE IF NOT EXISTS public.review_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.review_jobs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  detail text NOT NULL DEFAULT '',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_job_events_job_idx ON public.review_job_events (job_id, created_at);

CREATE OR REPLACE FUNCTION public.review_job_transition_allowed(_from text, _to text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _from = _to OR _to IN ('failed', 'cancelled') AND _from NOT IN ('completed', 'cancelled') OR (_from, _to) IN (
    ('queued', 'discovering'),
    ('discovering', 'identified'), ('discovering', 'awaiting_selection'),
    ('awaiting_selection', 'identified'),
    ('identified', 'fetching'), ('identified', 'analyzing'),
    ('fetching', 'analyzing'),
    ('analyzing', 'evidence_ready'), ('analyzing', 'needs_human_review'),
    ('evidence_ready', 'report_ready'), ('evidence_ready', 'completed'), ('evidence_ready', 'needs_human_review'),
    ('report_ready', 'completed'), ('needs_human_review', 'completed'),
    ('failed', 'queued')
  )
$$;

CREATE OR REPLACE FUNCTION public.record_review_job_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.review_job_events (job_id, workspace_id, from_status, to_status, detail)
    VALUES (NEW.id, NEW.workspace_id, NULL, NEW.status, NEW.detail);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.review_job_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid review job transition % -> %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status IN ('completed', 'failed', 'cancelled') THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    END IF;
    INSERT INTO public.review_job_events (job_id, workspace_id, from_status, to_status, detail, error_code)
    VALUES (NEW.id, NEW.workspace_id, OLD.status, NEW.status, NEW.detail, NEW.error_code);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS review_jobs_transition_insert ON public.review_jobs;
CREATE TRIGGER review_jobs_transition_insert AFTER INSERT ON public.review_jobs
  FOR EACH ROW EXECUTE FUNCTION public.record_review_job_transition();
DROP TRIGGER IF EXISTS review_jobs_transition_update ON public.review_jobs;
CREATE TRIGGER review_jobs_transition_update BEFORE UPDATE OF status ON public.review_jobs
  FOR EACH ROW EXECUTE FUNCTION public.record_review_job_transition();
DROP TRIGGER IF EXISTS review_jobs_touch ON public.review_jobs;
CREATE TRIGGER review_jobs_touch BEFORE UPDATE ON public.review_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Worker claim with lease, bounded attempts and backoff. Service role only.
CREATE OR REPLACE FUNCTION public.claim_review_jobs(_limit integer DEFAULT 2, _lease_seconds integer DEFAULT 300)
RETURNS SETOF public.review_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id FROM public.review_jobs
    WHERE attempt_count < max_attempts
      AND next_attempt_at <= now()
      AND (lease_expires_at IS NULL OR lease_expires_at < now())
      AND (
        status = 'queued'
        OR (status IN ('discovering', 'identified', 'fetching', 'analyzing', 'evidence_ready')
            AND lease_expires_at IS NOT NULL)
      )
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(_limit, 1), 10)
  )
  UPDATE public.review_jobs j
  SET attempt_count = j.attempt_count + 1,
      lease_expires_at = now() + make_interval(secs => LEAST(GREATEST(_lease_seconds, 30), 900)),
      started_at = COALESCE(j.started_at, now())
  FROM picked WHERE j.id = picked.id
  RETURNING j.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_review_jobs(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_review_jobs(integer, integer) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- 6. Cases, AI runs, evidence
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.review_locations(id) ON DELETE CASCADE,
  review_record_id uuid NOT NULL REFERENCES public.review_records(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.review_jobs(id) ON DELETE SET NULL,
  policy_version_id uuid REFERENCES public.policy_versions(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  decision text NOT NULL,
  verdict text NOT NULL,
  violation_category text NOT NULL DEFAULT 'none',
  headline text NOT NULL DEFAULT '',
  plain_summary text NOT NULL DEFAULT '',
  confidence integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'low',
  rejection_risk text NOT NULL DEFAULT 'low',
  model_agreement text NOT NULL DEFAULT 'single_model',
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_cases_workspace_review_unique UNIQUE (workspace_id, review_record_id),
  CONSTRAINT review_cases_decision_check CHECK (decision IN ('reportable', 'not_reportable', 'needs_human_review')),
  CONSTRAINT review_cases_verdict_check CHECK (verdict IN ('strong_candidate', 'possible_candidate', 'needs_human_review', 'not_reportable')),
  CONSTRAINT review_cases_confidence_check CHECK (confidence BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS review_cases_workspace_created_idx ON public.review_cases (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_cases_workspace_decision_idx ON public.review_cases (workspace_id, decision, created_at DESC);
CREATE INDEX IF NOT EXISTS review_cases_location_idx ON public.review_cases (location_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_jobs_case_fk') THEN
    ALTER TABLE public.review_jobs ADD CONSTRAINT review_jobs_case_fk FOREIGN KEY (case_id) REFERENCES public.review_cases(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.review_jobs(id) ON DELETE SET NULL,
  review_record_id uuid REFERENCES public.review_records(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.review_cases(id) ON DELETE SET NULL,
  stage text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  policy_version text NOT NULL,
  input_hash text NOT NULL,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence integer,
  duration_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_runs_stage_check CHECK (stage IN ('fast_classification', 'second_opinion', 'final_decision')),
  CONSTRAINT ai_runs_status_check CHECK (status IN ('completed', 'failed')),
  CONSTRAINT ai_runs_confidence_check CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  CONSTRAINT ai_runs_duration_check CHECK (duration_ms >= 0)
);
CREATE INDEX IF NOT EXISTS ai_runs_workspace_created_idx ON public.ai_runs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_reuse_idx ON public.ai_runs (workspace_id, input_hash, prompt_version, policy_version, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_case_idx ON public.ai_runs (case_id);
CREATE INDEX IF NOT EXISTS ai_runs_job_idx ON public.ai_runs (job_id);

CREATE TABLE IF NOT EXISTS public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  review_record_id uuid NOT NULL REFERENCES public.review_records(id) ON DELETE CASCADE,
  kind text NOT NULL,
  policy_category text NOT NULL DEFAULT 'none',
  content text NOT NULL,
  excerpt_start integer,
  excerpt_end integer,
  verified boolean NOT NULL DEFAULT false,
  source text NOT NULL,
  source_url text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_items_kind_check CHECK (kind IN ('supporting', 'counter', 'missing')),
  CONSTRAINT evidence_items_verified_excerpt_check CHECK (NOT verified OR (excerpt_start IS NOT NULL AND excerpt_end > excerpt_start)),
  CONSTRAINT evidence_items_supporting_verified_check CHECK (kind <> 'supporting' OR verified),
  CONSTRAINT evidence_items_case_kind_position_unique UNIQUE (case_id, kind, position)
);
CREATE INDEX IF NOT EXISTS evidence_items_case_idx ON public.evidence_items (case_id, kind, position);

-- ---------------------------------------------------------------------------------------------
-- 7. Reports, report events, appeals
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  route text NOT NULL DEFAULT 'google_maps_report_review',
  report_reason text NOT NULL DEFAULT '',
  report_body text NOT NULL DEFAULT '',
  external_reference text,
  outcome_source text,
  outcome_note text NOT NULL DEFAULT '',
  submitted_at timestamptz,
  decided_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_case_version_unique UNIQUE (case_id, version),
  CONSTRAINT reports_status_check CHECK (status IN (
    'draft', 'ready', 'submitted', 'processing', 'decision', 'removed', 'not_removed',
    'escalated', 'appeal_available', 'appeal_submitted', 'appeal_result')),
  CONSTRAINT reports_route_check CHECK (route IN ('google_maps_report_review', 'google_business_profile_support', 'google_legal_removal_request')),
  -- A review is never "removed" without a recorded Google decision.
  CONSTRAINT reports_removed_requires_google_decision CHECK (
    status <> 'removed' OR (decided_at IS NOT NULL AND outcome_source IN ('google_decision_notice', 'google_support_case', 'google_legal_decision'))),
  CONSTRAINT reports_submitted_requires_time CHECK (status IN ('draft', 'ready') OR submitted_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS reports_workspace_status_idx ON public.reports (workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS reports_case_idx ON public.reports (case_id, version DESC);

CREATE TABLE IF NOT EXISTS public.report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid,
  from_status text,
  to_status text NOT NULL,
  note text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_events_report_idx ON public.report_events (report_id, created_at);

CREATE OR REPLACE FUNCTION public.report_transition_allowed(_from text, _to text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _from = _to OR (_from, _to) IN (
    ('draft', 'ready'), ('ready', 'draft'), ('ready', 'submitted'),
    ('submitted', 'processing'), ('submitted', 'decision'),
    ('processing', 'decision'), ('processing', 'escalated'),
    ('escalated', 'decision'),
    ('decision', 'removed'), ('decision', 'not_removed'),
    ('not_removed', 'appeal_available'), ('not_removed', 'escalated'),
    ('appeal_available', 'appeal_submitted'),
    ('appeal_submitted', 'appeal_result'),
    ('appeal_result', 'removed'), ('appeal_result', 'not_removed')
  )
$$;

CREATE OR REPLACE FUNCTION public.record_report_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.report_events (report_id, workspace_id, actor_id, from_status, to_status, note)
    VALUES (NEW.id, NEW.workspace_id, COALESCE(auth.uid(), NEW.created_by), NULL, NEW.status, 'Report created');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.report_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Invalid report transition % -> %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
    INSERT INTO public.report_events (report_id, workspace_id, actor_id, from_status, to_status, note, metadata)
    VALUES (NEW.id, NEW.workspace_id, COALESCE(auth.uid(), NEW.updated_by), OLD.status, NEW.status, NEW.outcome_note,
            jsonb_build_object('external_reference', NEW.external_reference, 'outcome_source', NEW.outcome_source));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reports_transition_insert ON public.reports;
CREATE TRIGGER reports_transition_insert AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.record_report_transition();
DROP TRIGGER IF EXISTS reports_transition_update ON public.reports;
CREATE TRIGGER reports_transition_update BEFORE UPDATE OF status ON public.reports FOR EACH ROW EXECUTE FUNCTION public.record_report_transition();
DROP TRIGGER IF EXISTS reports_touch ON public.reports;
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.report_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  round integer NOT NULL,
  reason text NOT NULL,
  external_reference text,
  status text NOT NULL DEFAULT 'prepared',
  submitted_at timestamptz,
  resolved_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_appeals_round_unique UNIQUE (report_id, round),
  CONSTRAINT report_appeals_status_check CHECK (status IN ('prepared', 'submitted', 'accepted', 'rejected', 'withdrawn'))
);

-- ---------------------------------------------------------------------------------------------
-- 8. Google Business Profile connections (encrypted tokens, one-time PKCE state)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_business_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connected_by uuid NOT NULL,
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
  CONSTRAINT google_business_connections_workspace_unique UNIQUE (workspace_id),
  CONSTRAINT google_business_connections_status_check CHECK (status IN ('connected', 'reauthorization_required', 'revoked'))
);
DROP TRIGGER IF EXISTS google_business_connections_touch ON public.google_business_connections;
CREATE TRIGGER google_business_connections_touch BEFORE UPDATE ON public.google_business_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  state_hash text NOT NULL UNIQUE,
  code_verifier_ciphertext text NOT NULL,
  redirect_origin text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS google_oauth_states_expiry_idx ON public.google_oauth_states (expires_at) WHERE used_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_google_oauth_state(_state_hash text)
RETURNS SETOF public.google_oauth_states
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.google_oauth_states
  SET used_at = now()
  WHERE state_hash = _state_hash AND used_at IS NULL AND expires_at > now()
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_google_oauth_state(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_google_oauth_state(text) TO service_role;

-- ---------------------------------------------------------------------------------------------
-- 9. Bulk queue (each URL becomes an independent review job)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  total_items integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT bulk_jobs_status_check CHECK (status IN ('queued', 'running', 'completed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS bulk_jobs_workspace_created_idx ON public.bulk_jobs (workspace_id, created_at DESC);
DROP TRIGGER IF EXISTS bulk_jobs_touch ON public.bulk_jobs;
CREATE TRIGGER bulk_jobs_touch BEFORE UPDATE ON public.bulk_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.bulk_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_job_id uuid NOT NULL REFERENCES public.bulk_jobs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  position integer NOT NULL,
  source_url text NOT NULL,
  canonical_url text NOT NULL,
  review_job_id uuid REFERENCES public.review_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_job_items_url_unique UNIQUE (bulk_job_id, canonical_url)
);
CREATE INDEX IF NOT EXISTS bulk_job_items_job_idx ON public.bulk_job_items (bulk_job_id, position);

-- ---------------------------------------------------------------------------------------------
-- 10. Notifications (legacy table extended) and audit log
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, is_read, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx ON public.audit_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------------------------
-- 11. Grants and row-level security for workspace-scoped tables
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  _table text;
BEGIN
  -- Workspace data is readable by members (and the platform superadmin). Every write goes through
  -- the server, which authorizes session, workspace, role and resource first. Clients can never
  -- write these rows directly, so they cannot forge verified evidence, AI results, job history or
  -- report outcomes. (Supabase grants new tables to `authenticated` by default, hence the REVOKE.)
  FOREACH _table IN ARRAY ARRAY[
    'review_locations', 'review_records', 'review_jobs', 'review_job_events', 'review_cases', 'ai_runs',
    'evidence_items', 'reports', 'report_events', 'report_appeals', 'bulk_jobs', 'bulk_job_items', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _table);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', _table);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', _table);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', _table);
    EXECUTE format('DROP POLICY IF EXISTS "Workspace members insert" ON public.%I', _table);
    EXECUTE format('DROP POLICY IF EXISTS "Workspace members update" ON public.%I', _table);
    EXECUTE format('DROP POLICY IF EXISTS "Workspace admins delete" ON public.%I', _table);
    EXECUTE format('DROP POLICY IF EXISTS "Workspace members read" ON public.%I', _table);
    EXECUTE format('CREATE POLICY "Workspace members read" ON public.%I FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id) OR public.is_superadmin())', _table);
  END LOOP;

  FOREACH _table IN ARRAY ARRAY['workspaces', 'workspace_members', 'policy_versions', 'policy_categories'] LOOP
    EXECUTE format('REVOKE INSERT, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', _table);
  END LOOP;
  REVOKE UPDATE ON public.workspace_members, public.policy_versions, public.policy_categories FROM anon, authenticated;

  -- OAuth tokens and state are never readable by clients, even encrypted.
  FOREACH _table IN ARRAY ARRAY['google_business_connections', 'google_oauth_states'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _table);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', _table);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', _table);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------
-- 12. Realtime: clients follow their own jobs and reports live (RLS still applies).
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  _table text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH _table IN ARRAY ARRAY['review_jobs', 'reports'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = _table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _table);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- 13. Super admin system overview (aggregates only, never secrets)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_system_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN jsonb_build_object(
    'workspaces', (SELECT count(*) FROM public.workspaces WHERE deleted_at IS NULL),
    'members', (SELECT count(DISTINCT user_id) FROM public.workspace_members),
    'jobs_24h', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM public.review_jobs WHERE created_at > now() - interval '24 hours' GROUP BY status) s),
    'jobs_stuck', (SELECT count(*) FROM public.review_jobs WHERE status IN ('discovering', 'identified', 'fetching', 'analyzing') AND lease_expires_at < now()),
    'jobs_failed_24h', (SELECT count(*) FROM public.review_jobs WHERE status = 'failed' AND updated_at > now() - interval '24 hours'),
    'ai_runs_24h', (SELECT jsonb_build_object(
        'completed', count(*) FILTER (WHERE status = 'completed'),
        'failed', count(*) FILTER (WHERE status = 'failed'),
        'p50_ms', percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms),
        'p95_ms', percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))
      FROM public.ai_runs WHERE created_at > now() - interval '24 hours'),
    'scan_seconds_p50_24h', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM completed_at - created_at))
      FROM public.review_jobs WHERE completed_at IS NOT NULL AND created_at > now() - interval '24 hours'),
    'reports', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM public.reports GROUP BY status) r),
    'google_connections', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM public.google_business_connections GROUP BY status) g)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_system_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_system_overview() TO authenticated, service_role;
