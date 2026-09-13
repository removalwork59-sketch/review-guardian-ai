CREATE TABLE public.bulk_jobs (
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
CREATE POLICY "Users read own bulk jobs" ON public.bulk_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bulk jobs" ON public.bulk_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bulk jobs" ON public.bulk_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX bulk_jobs_user_created_idx ON public.bulk_jobs(user_id, created_at DESC);
CREATE TRIGGER bulk_jobs_touch BEFORE UPDATE ON public.bulk_jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bulk_job_items (
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
CREATE POLICY "Users read own bulk items" ON public.bulk_job_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bulk items" ON public.bulk_job_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bulk items" ON public.bulk_job_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX bulk_job_items_claim_idx ON public.bulk_job_items(job_id, status, lease_expires_at, created_at);
CREATE INDEX bulk_job_items_user_status_idx ON public.bulk_job_items(user_id, status, updated_at DESC);
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