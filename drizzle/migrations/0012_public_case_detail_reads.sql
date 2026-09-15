GRANT SELECT ON public.review_cases TO anon;
GRANT SELECT ON public.locations TO anon;

DROP POLICY IF EXISTS "Public can read locations of published cases" ON public.locations;
CREATE POLICY "Public can read locations of published cases"
ON public.locations
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.review_cases c
    WHERE c.location_id = locations.id
      AND c.public_status = true
  )
);