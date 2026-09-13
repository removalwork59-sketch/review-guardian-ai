CREATE TABLE public.google_business_connections (
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
CREATE POLICY "Users read own Google Business connection" ON public.google_business_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own Google Business connection" ON public.google_business_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER google_business_connections_touch BEFORE UPDATE ON public.google_business_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.google_oauth_states (
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
CREATE POLICY "Users create own Google OAuth state" ON public.google_oauth_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX google_oauth_states_expiry_idx ON public.google_oauth_states(expires_at) WHERE used_at IS NULL;