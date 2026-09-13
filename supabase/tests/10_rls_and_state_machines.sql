-- Database tests for the Removal Work schema: workspace isolation, read-only clients, roles,
-- identity privacy, state machines, evidence integrity and worker/admin function access.
--
-- Expects (see scripts/test-db.sh): shims + legacy workspace tables + legacy seed + schema migration.
-- Legacy seed: business ...b001 owned by user ...0001 with user ...0002 as an 'analyst' member;
-- user ...0003 is a platform superadmin; user ...0004 is new; user ...0005 becomes a viewer.
-- Writes in these tests run as service_role, exactly like the application server.

\set ON_ERROR_STOP 1
SET client_min_messages = notice;

CREATE OR REPLACE FUNCTION pg_temp.ok(_condition boolean, _name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _condition IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', _name; END IF;
  RAISE NOTICE 'PASS: %', _name;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(_user uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _user, 'role', 'authenticated', 'email', _user || '@test.local')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_server() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';
END $$;

-- ---------------------------------------------------------------------------------------------
-- Legacy backfill
-- ---------------------------------------------------------------------------------------------
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.workspaces WHERE id = '00000000-0000-0000-0000-00000000b001'), 'legacy business copied to workspace with the same id');
SELECT pg_temp.ok((SELECT role::text = 'owner' FROM public.workspace_members WHERE workspace_id = '00000000-0000-0000-0000-00000000b001' AND user_id = '00000000-0000-0000-0000-000000000001'), 'legacy owner becomes workspace owner');
SELECT pg_temp.ok((SELECT role::text = 'member' FROM public.workspace_members WHERE workspace_id = '00000000-0000-0000-0000-00000000b001' AND user_id = '00000000-0000-0000-0000-000000000002'), 'legacy analyst becomes workspace member');

-- ---------------------------------------------------------------------------------------------
-- Server writes, member reads, clients never write
-- ---------------------------------------------------------------------------------------------
BEGIN;
SELECT pg_temp.as_server();
INSERT INTO public.review_locations (id, workspace_id, place_id, name)
VALUES ('00000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-00000000b001', 'place-1', 'Test Cafe');
COMMIT;

BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.review_locations), 'member reads their workspace''s locations');
DO $$ BEGIN
  INSERT INTO public.review_locations (workspace_id, place_id, name) VALUES ('00000000-0000-0000-0000-00000000b001', 'place-m', 'Direct write');
  RAISE EXCEPTION 'FAIL: member wrote a row directly';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: members cannot write workspace data directly (server only)';
END $$;
DO $$ BEGIN
  UPDATE public.review_locations SET name = 'Renamed' WHERE id = '00000000-0000-0000-0000-0000000010c1';
  RAISE EXCEPTION 'FAIL: member updated a row directly';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: members cannot update workspace data directly';
END $$;
ROLLBACK;

BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000004');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.review_locations), 'non-member sees no locations of another workspace');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.workspaces), 'non-member sees no other workspaces');
SELECT pg_temp.ok(NOT public.is_workspace_member('00000000-0000-0000-0000-00000000b001'), 'non-member is not recognised as a member (IDOR guard)');
DO $$ BEGIN
  DELETE FROM public.review_locations WHERE id = '00000000-0000-0000-0000-0000000010c1';
  RAISE EXCEPTION 'FAIL: non-member deleted a row';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: non-member cannot delete another workspace''s rows';
END $$;
ROLLBACK;

-- Personal workspace bootstrap
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000004');
SELECT set_config('test.ws', public.ensure_my_workspace()::text, true);
SELECT pg_temp.ok(public.ensure_my_workspace()::text = current_setting('test.ws'), 'ensure_my_workspace is idempotent');
SELECT pg_temp.ok(public.has_workspace_role(current_setting('test.ws')::uuid, 'owner'), 'new user owns their personal workspace');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.workspaces), 'new user sees only their own workspace');
COMMIT;

-- Roles
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000005', 'viewer');
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000005');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.review_locations), 'viewer can read workspace data');
SELECT pg_temp.ok(NOT public.has_workspace_role('00000000-0000-0000-0000-00000000b001', 'member'), 'viewer does not have member rights');
DO $$ BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000005', 'owner');
  RAISE EXCEPTION 'FAIL: viewer promoted themselves';
EXCEPTION WHEN insufficient_privilege OR unique_violation THEN RAISE NOTICE 'PASS: users cannot change workspace membership';
END $$;
ROLLBACK;
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok(public.has_workspace_role('00000000-0000-0000-0000-00000000b001', 'member'), 'member has member rights');
SELECT pg_temp.ok(NOT public.has_workspace_role('00000000-0000-0000-0000-00000000b001', 'admin'), 'member does not have admin rights');
ROLLBACK;

-- ---------------------------------------------------------------------------------------------
-- Identity privacy (legacy "read everyone" policies are gone)
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.profiles (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'member@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'outsider@test.local')
ON CONFLICT (id) DO NOTHING;
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000004');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.profiles WHERE id <> '00000000-0000-0000-0000-000000000004'), 'outsider cannot read other users'' profiles');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.user_roles WHERE user_id <> '00000000-0000-0000-0000-000000000004'), 'outsider cannot read other users'' platform roles');
ROLLBACK;
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001'), 'member can read a colleague''s profile');
SELECT pg_temp.ok(NOT public.is_superadmin(), 'member is not a superadmin');
DO $$ BEGIN
  PERFORM public.admin_system_overview();
  RAISE EXCEPTION 'FAIL: member loaded the admin overview';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: member cannot load the admin overview';
END $$;
DO $$ BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-000000000002', 'superadmin');
  RAISE EXCEPTION 'FAIL: member granted themselves superadmin';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: users cannot grant themselves platform roles';
END $$;
ROLLBACK;
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000003');
SELECT pg_temp.ok(public.is_superadmin(), 'superadmin is recognised');
SELECT pg_temp.ok((SELECT count(*) >= 1 FROM public.review_locations), 'superadmin can read across workspaces');
SELECT pg_temp.ok((public.admin_system_overview() ? 'workspaces'), 'superadmin can load the system overview');
ROLLBACK;

-- ---------------------------------------------------------------------------------------------
-- Review job state machine, idempotency and worker claim
-- ---------------------------------------------------------------------------------------------
BEGIN;
SELECT pg_temp.as_server();
INSERT INTO public.review_jobs (id, workspace_id, created_by, idempotency_key, source_url, canonical_url)
VALUES ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000002', 'key-1', 'https://maps.google.com/x', 'https://maps.google.com/x');
DO $$ BEGIN
  INSERT INTO public.review_jobs (workspace_id, created_by, idempotency_key, source_url, canonical_url)
  VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000002', 'key-1', 'https://maps.google.com/x', 'https://maps.google.com/x');
  RAISE EXCEPTION 'FAIL: duplicate idempotency key accepted';
EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'PASS: idempotency key prevents duplicate jobs';
END $$;
UPDATE public.review_jobs SET status = 'discovering' WHERE id = '00000000-0000-0000-0000-0000000010b1';
DO $$ BEGIN
  UPDATE public.review_jobs SET status = 'completed' WHERE id = '00000000-0000-0000-0000-0000000010b1';
  RAISE EXCEPTION 'FAIL: skipped straight from discovering to completed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: invalid job transition is rejected';
END $$;
UPDATE public.review_jobs SET status = 'failed', error_code = 'provider_unavailable' WHERE id = '00000000-0000-0000-0000-0000000010b1';
UPDATE public.review_jobs SET status = 'queued' WHERE id = '00000000-0000-0000-0000-0000000010b1';
SELECT pg_temp.ok((SELECT array_agg(to_status ORDER BY created_at, to_status) FROM public.review_job_events WHERE job_id = '00000000-0000-0000-0000-0000000010b1') @> ARRAY['queued', 'discovering', 'failed'], 'every job transition is recorded');
COMMIT;

BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.review_jobs), 'member can follow their workspace''s jobs');
DO $$ BEGIN
  UPDATE public.review_jobs SET status = 'report_ready' WHERE id = '00000000-0000-0000-0000-0000000010b1';
  RAISE EXCEPTION 'FAIL: member changed job status directly';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: users cannot change job status directly';
END $$;
DO $$ BEGIN
  PERFORM public.claim_review_jobs(1, 60);
  RAISE EXCEPTION 'FAIL: signed-in user could call the worker claim';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: worker claim is not callable by users';
END $$;
DO $$ BEGIN
  INSERT INTO public.review_job_events (job_id, workspace_id, to_status) VALUES ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-00000000b001', 'completed');
  RAISE EXCEPTION 'FAIL: user forged a job event';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: users cannot forge job history';
END $$;
ROLLBACK;

BEGIN;
SELECT pg_temp.as_server();
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.claim_review_jobs(5, 60)), 'worker claims a queued job');
SELECT pg_temp.ok((SELECT attempt_count = 1 AND lease_expires_at > now() FROM public.review_jobs WHERE id = '00000000-0000-0000-0000-0000000010b1'), 'claim increments attempts and sets a lease');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.claim_review_jobs(5, 60)), 'a leased job is not claimed twice');
ROLLBACK;

-- ---------------------------------------------------------------------------------------------
-- Cases, evidence and the report state machine
-- ---------------------------------------------------------------------------------------------
BEGIN;
SELECT pg_temp.as_server();
INSERT INTO public.review_records (id, workspace_id, location_id, source, external_id, content_fingerprint, identity_status, identity_method, identity_confidence, review_text)
VALUES ('00000000-0000-0000-0000-0000000010d1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000010c1', 'google_places', 'places/p/reviews/r1', 'fp1', 'exact_url_match', 'provider_review_id', 100, 'Call 555-0100 for cheap tickets');
INSERT INTO public.review_cases (id, workspace_id, location_id, review_record_id, created_by, decision, verdict, violation_category, confidence)
VALUES ('00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000010c1', '00000000-0000-0000-0000-0000000010d1', '00000000-0000-0000-0000-000000000002', 'reportable', 'strong_candidate', 'spam_or_advertising', 88);
DO $$ BEGIN
  INSERT INTO public.evidence_items (workspace_id, case_id, review_record_id, kind, content, verified, source)
  VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-0000000010d1', 'supporting', 'they stole my wallet', false, 'ai_analysis');
  RAISE EXCEPTION 'FAIL: unverified supporting evidence accepted';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: supporting evidence must be verified against the review text';
END $$;
INSERT INTO public.evidence_items (workspace_id, case_id, review_record_id, kind, content, excerpt_start, excerpt_end, verified, source)
VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-0000000010d1', 'supporting', 'Call 555-0100 for cheap tickets', 0, 31, true, 'ai_analysis');

INSERT INTO public.reports (id, workspace_id, case_id, created_by, report_reason)
VALUES ('00000000-0000-0000-0000-0000000010f1', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-000000000002', 'Advertising');
UPDATE public.reports SET status = 'ready', updated_by = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-0000000010f1';
DO $$ BEGIN
  UPDATE public.reports SET status = 'submitted' WHERE id = '00000000-0000-0000-0000-0000000010f1';
  RAISE EXCEPTION 'FAIL: submitted without a submission time';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: a submitted report needs a submission time';
END $$;
UPDATE public.reports SET status = 'submitted', submitted_at = now() WHERE id = '00000000-0000-0000-0000-0000000010f1';
DO $$ BEGIN
  UPDATE public.reports SET status = 'removed', decided_at = now(), outcome_source = 'google_decision_notice' WHERE id = '00000000-0000-0000-0000-0000000010f1';
  RAISE EXCEPTION 'FAIL: jumped from submitted to removed';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: removal cannot skip Google''s decision step';
END $$;
UPDATE public.reports SET status = 'processing' WHERE id = '00000000-0000-0000-0000-0000000010f1';
UPDATE public.reports SET status = 'decision' WHERE id = '00000000-0000-0000-0000-0000000010f1';
DO $$ BEGIN
  UPDATE public.reports SET status = 'removed' WHERE id = '00000000-0000-0000-0000-0000000010f1';
  RAISE EXCEPTION 'FAIL: removed without a recorded Google decision';
EXCEPTION WHEN check_violation THEN RAISE NOTICE 'PASS: "removed" requires a recorded Google decision';
END $$;
UPDATE public.reports SET status = 'removed', decided_at = now(), outcome_source = 'google_decision_notice', outcome_note = 'Google confirmed removal'
WHERE id = '00000000-0000-0000-0000-0000000010f1';
SELECT pg_temp.ok((SELECT count(*) = 6 FROM public.report_events WHERE report_id = '00000000-0000-0000-0000-0000000010f1'), 'every report transition is recorded (draft→ready→submitted→processing→decision→removed)');
SELECT pg_temp.ok((SELECT bool_and(actor_id = '00000000-0000-0000-0000-000000000002') FROM public.report_events WHERE report_id = '00000000-0000-0000-0000-0000000010f1'), 'report events record the acting user');
COMMIT;

BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT count(*) = 1 FROM public.evidence_items), 'member can read the case evidence');
DO $$ BEGIN
  INSERT INTO public.evidence_items (workspace_id, case_id, review_record_id, kind, content, excerpt_start, excerpt_end, verified, source)
  VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000010e1', '00000000-0000-0000-0000-0000000010d1', 'supporting', 'forged quote', 0, 5, true, 'ai_analysis');
  RAISE EXCEPTION 'FAIL: member inserted verified evidence';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: users cannot insert evidence';
END $$;
DO $$ BEGIN
  UPDATE public.reports SET status = 'not_removed' WHERE id = '00000000-0000-0000-0000-0000000010f1';
  RAISE EXCEPTION 'FAIL: member changed a report outcome directly';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: users cannot change report outcomes directly';
END $$;
DO $$ BEGIN
  PERFORM 1 FROM public.google_business_connections;
  RAISE EXCEPTION 'FAIL: client read the OAuth token table';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: OAuth token table is not readable by clients';
END $$;
ROLLBACK;

-- Soft-deleted workspace revokes access
UPDATE public.workspaces SET deleted_at = now() WHERE id = '00000000-0000-0000-0000-00000000b001';
BEGIN;
SELECT pg_temp.as_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT count(*) = 0 FROM public.review_locations), 'members lose access when a workspace is soft-deleted');
ROLLBACK;
UPDATE public.workspaces SET deleted_at = NULL WHERE id = '00000000-0000-0000-0000-00000000b001';

SELECT 'ALL DATABASE TESTS PASSED' AS result;
