ALTER TABLE public.review_cases
  ADD COLUMN IF NOT EXISTS public_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS review_cases_public_slug_key
  ON public.review_cases (public_slug) WHERE public_slug IS NOT NULL;

-- Anonymous visitors may read ONLY the owner-published status columns.
GRANT SELECT (id, public_slug, public_status, platform, status, verdict, headline, confidence, severity, reported_at, resolved_at, created_at, updated_at)
  ON public.review_cases TO anon;

DROP POLICY IF EXISTS "Public can read published case status" ON public.review_cases;
CREATE POLICY "Public can read published case status"
  ON public.review_cases
  FOR SELECT
  TO anon
  USING (public_status = true);
