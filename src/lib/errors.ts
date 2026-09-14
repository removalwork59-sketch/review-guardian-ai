/** Shared, client-safe error helpers. They surface real blockers instead of vague failures. */

export const MIGRATION_BLOCKER =
  "Removal Work's database schema has not been applied to the production Supabase project yet, so this can't load. An administrator needs to run supabase/migrations/20260913200000_removal_work_schema.sql in the Supabase SQL Editor.";

type ErrorLike = { code?: unknown; message?: unknown };

function codeOf(error: unknown) {
  return typeof error === "object" && error !== null ? String((error as ErrorLike).code ?? "") : "";
}

/** PostgREST / Postgres codes for a missing table or function. */
export function isSchemaMissing(error: unknown) {
  return ["PGRST205", "PGRST202", "42P01", "42883"].includes(codeOf(error));
}

/**
 * Converts a Supabase/Postgres error into an Error safe to send to the browser: the missing-schema
 * blocker is named explicitly; anything else keeps its code (details stay in server logs).
 */
export function dbError(error: unknown): Error {
  if (isSchemaMissing(error)) return new Error(MIGRATION_BLOCKER);
  if (error instanceof Error && !codeOf(error)) return error;
  const code = codeOf(error);
  console.error(
    "[database]",
    code,
    typeof error === "object" && error !== null ? (error as ErrorLike).message : error,
  );
  return new Error(`The database refused this request${code ? ` (error ${code})` : ""}.`);
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as ErrorLike).message);
  }
  return "";
}

/** True when a server function refused the call for lack of permission (403-style errors). */
export function isForbidden(error: unknown) {
  return error instanceof Error && /super admin|permission|not a member/i.test(error.message);
}
