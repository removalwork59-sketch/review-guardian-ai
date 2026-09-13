-- Rollback for 20260913200000_removal_work_schema.sql.
-- Drops only the objects that migration created. Legacy OrbitRep tables and their data are not
-- touched; columns added to shared tables (profiles, notifications) are kept because they are
-- harmless and may already hold data. The tightened legacy policies are restored as they were.
-- Take a database backup before running this: it permanently deletes Removal Work data.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'review_jobs') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.review_jobs;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reports') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.admin_system_overview();
DROP FUNCTION IF EXISTS public.claim_google_oauth_state(text);
DROP FUNCTION IF EXISTS public.claim_review_jobs(integer, integer);

DROP TABLE IF EXISTS public.audit_logs;
ALTER TABLE IF EXISTS public.notifications DROP COLUMN IF EXISTS workspace_id;
DROP TABLE IF EXISTS public.bulk_job_items;
DROP TABLE IF EXISTS public.bulk_jobs;
DROP TABLE IF EXISTS public.google_oauth_states;
DROP TABLE IF EXISTS public.google_business_connections;
DROP TABLE IF EXISTS public.report_appeals;
DROP TABLE IF EXISTS public.report_events;
DROP TABLE IF EXISTS public.reports;
DROP TABLE IF EXISTS public.evidence_items;
DROP TABLE IF EXISTS public.ai_runs;
ALTER TABLE IF EXISTS public.review_jobs DROP CONSTRAINT IF EXISTS review_jobs_case_fk;
DROP TABLE IF EXISTS public.review_cases;
DROP TABLE IF EXISTS public.review_job_events;
DROP TABLE IF EXISTS public.review_jobs;
DROP TABLE IF EXISTS public.review_records;
DROP TABLE IF EXISTS public.review_locations;
DROP TABLE IF EXISTS public.policy_categories;
DROP TABLE IF EXISTS public.policy_versions;

DROP FUNCTION IF EXISTS public.record_report_transition();
DROP FUNCTION IF EXISTS public.report_transition_allowed(text, text);
DROP FUNCTION IF EXISTS public.record_review_job_transition();
DROP FUNCTION IF EXISTS public.review_job_transition_allowed(text, text);
DROP FUNCTION IF EXISTS public.ensure_my_workspace();

-- Restore the legacy identity policies that the migration replaced.
DROP POLICY IF EXISTS "Profiles readable by self, colleagues and superadmin" ON public.profiles;
DO $$ BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
    CREATE POLICY "user_roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Members read workspace membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Members read their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners update their workspaces" ON public.workspaces;
DROP TABLE IF EXISTS public.workspace_members;
DROP TABLE IF EXISTS public.workspaces;
DROP FUNCTION IF EXISTS public.has_workspace_role(uuid, text);
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid);
DROP FUNCTION IF EXISTS public.workspace_role_rank(text);
DROP TYPE IF EXISTS public.workspace_role;
