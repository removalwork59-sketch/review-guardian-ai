ALTER TABLE public.review_records
  ADD COLUMN identity_status text NOT NULL DEFAULT 'provider_observed',
  ADD COLUMN identity_method text NOT NULL DEFAULT 'provider_sample',
  ADD COLUMN identity_confidence integer NOT NULL DEFAULT 50,
  ADD COLUMN requested_source_url text NOT NULL DEFAULT '',
  ADD COLUMN verified_at timestamptz,
  ADD CONSTRAINT review_records_identity_status_check CHECK (identity_status IN ('provider_observed','exact_url_match','user_selected','official_sync_verified','unverified')),
  ADD CONSTRAINT review_records_identity_confidence_check CHECK (identity_confidence BETWEEN 0 AND 100);

CREATE INDEX review_records_user_identity_idx ON public.review_records(user_id, identity_status, last_seen_at DESC);

CREATE TABLE public.ai_runs (
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
CREATE POLICY "Users read own AI runs" ON public.ai_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own AI runs" ON public.ai_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_runs_user_created_idx ON public.ai_runs(user_id, created_at DESC);
CREATE INDEX ai_runs_review_idx ON public.ai_runs(review_record_id, created_at DESC);
CREATE INDEX ai_runs_case_idx ON public.ai_runs(case_id, created_at DESC);
CREATE INDEX ai_runs_input_hash_idx ON public.ai_runs(user_id, input_hash);