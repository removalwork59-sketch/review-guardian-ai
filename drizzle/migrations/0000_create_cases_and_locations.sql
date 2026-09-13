CREATE TABLE public.locations (
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
  UNIQUE (user_id, place_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own locations" ON public.locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own locations" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own locations" ON public.locations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own locations" ON public.locations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.review_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
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
  UNIQUE (user_id, review_external_id)
);

CREATE INDEX review_cases_user_created_idx ON public.review_cases (user_id, created_at DESC);
CREATE INDEX review_cases_location_idx ON public.review_cases (location_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_cases TO authenticated;
GRANT ALL ON public.review_cases TO service_role;
ALTER TABLE public.review_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cases" ON public.review_cases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cases" ON public.review_cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cases" ON public.review_cases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own cases" ON public.review_cases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

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

CREATE TRIGGER locations_touch BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER review_cases_touch BEFORE UPDATE ON public.review_cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();