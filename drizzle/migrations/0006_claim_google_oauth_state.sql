CREATE OR REPLACE FUNCTION public.claim_google_oauth_state(_state_hash text)
RETURNS SETOF public.google_oauth_states
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.google_oauth_states
  SET used_at = now()
  WHERE state_hash = _state_hash
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.claim_google_oauth_state(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_google_oauth_state(text) TO service_role;