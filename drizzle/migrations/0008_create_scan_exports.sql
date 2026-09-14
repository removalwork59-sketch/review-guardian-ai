CREATE TABLE public.scan_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.scan_exports TO authenticated;
GRANT ALL ON public.scan_exports TO service_role;

ALTER TABLE public.scan_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan exports"
  ON public.scan_exports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own scan exports"
  ON public.scan_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own scan exports"
  ON public.scan_exports
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER touch_scan_exports_updated_at
  BEFORE UPDATE ON public.scan_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();