ALTER TABLE public.scan_exports
  ADD CONSTRAINT scan_exports_case_id_fk
  FOREIGN KEY (case_id) REFERENCES public.review_cases(id) ON DELETE CASCADE;

-- Rebuild types so the relationship is discoverable
NOTIFY pgrst, 'reload schema';