CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  email_status text NOT NULL DEFAULT 'unknown',
  status text NOT NULL DEFAULT 'new',
  handled_note text NOT NULL DEFAULT '',
  source_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read contact messages"
ON public.contact_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins update contact messages"
ON public.contact_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins delete contact messages"
ON public.contact_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER contact_messages_touch
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  cover_image_url text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published posts"
ON public.blog_posts FOR SELECT TO anon
USING (published = true);

CREATE POLICY "Authors read own posts"
ON public.blog_posts FOR SELECT TO authenticated
USING (published = true OR auth.uid() = author_id);

CREATE POLICY "Authors insert own posts"
ON public.blog_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own posts"
ON public.blog_posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors delete own posts"
ON public.blog_posts FOR DELETE TO authenticated
USING (auth.uid() = author_id);

CREATE TRIGGER blog_posts_touch
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();