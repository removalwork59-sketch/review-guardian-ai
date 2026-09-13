CREATE TABLE public.review_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_records_user_platform_external_unique UNIQUE (user_id, platform, external_id),
  CONSTRAINT review_records_user_fingerprint_unique UNIQUE (user_id, platform, content_fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_records TO authenticated;
GRANT ALL ON public.review_records TO service_role;
ALTER TABLE public.review_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own review records" ON public.review_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own review records" ON public.review_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review records" ON public.review_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own review records" ON public.review_records FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX review_records_user_location_idx ON public.review_records(user_id, location_id, last_seen_at DESC);
CREATE INDEX review_records_user_last_seen_idx ON public.review_records(user_id, last_seen_at DESC);
CREATE TRIGGER review_records_touch BEFORE UPDATE ON public.review_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.review_cases
  ADD COLUMN review_record_id uuid REFERENCES public.review_records(id) ON DELETE SET NULL,
  ADD COLUMN canonical_source_url text NOT NULL DEFAULT '',
  ADD COLUMN analysis_version integer NOT NULL DEFAULT 1,
  ADD COLUMN appealed_at timestamptz,
  ADD COLUMN appeal_round integer NOT NULL DEFAULT 0;
CREATE INDEX review_cases_user_status_created_idx ON public.review_cases(user_id, status, created_at DESC);
CREATE INDEX review_cases_review_record_idx ON public.review_cases(review_record_id);

CREATE TABLE public.case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public.review_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.case_events TO authenticated;
GRANT ALL ON public.case_events TO service_role;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own case events" ON public.case_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own case events" ON public.case_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX case_events_user_case_created_idx ON public.case_events(user_id, case_id, created_at DESC);

CREATE TABLE public.report_drafts (
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
CREATE POLICY "Users read own report drafts" ON public.report_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own report drafts" ON public.report_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own report drafts" ON public.report_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own report drafts" ON public.report_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX report_drafts_user_status_idx ON public.report_drafts(user_id, status, updated_at DESC);
CREATE TRIGGER report_drafts_touch BEFORE UPDATE ON public.report_drafts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.case_appeals (
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
CREATE POLICY "Users read own case appeals" ON public.case_appeals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own case appeals" ON public.case_appeals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own case appeals" ON public.case_appeals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own case appeals" ON public.case_appeals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX case_appeals_user_case_idx ON public.case_appeals(user_id, case_id, round DESC);
CREATE TRIGGER case_appeals_touch BEFORE UPDATE ON public.case_appeals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.record_case_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.case_events(user_id, case_id, event_type, message, metadata)
    VALUES (NEW.user_id, NEW.id, 'case_created', 'Case created', jsonb_build_object('status', NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.case_events(user_id, case_id, event_type, message, metadata)
    VALUES (NEW.user_id, NEW.id, 'status_changed', COALESCE(NEW.status_note, ''), jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER review_cases_status_event AFTER INSERT OR UPDATE OF status ON public.review_cases FOR EACH ROW EXECUTE FUNCTION public.record_case_status_event();