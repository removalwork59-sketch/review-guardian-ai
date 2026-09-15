ALTER TABLE public.review_cases
  ADD COLUMN IF NOT EXISTS owner_reply TEXT,
  ADD COLUMN IF NOT EXISTS owner_reply_at TIMESTAMPTZ;