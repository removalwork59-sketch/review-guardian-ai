/** True when a server function refused the call for lack of permission (403-style errors). */
export function isForbidden(error: unknown) {
  return error instanceof Error && /super admin|permission|not a member/i.test(error.message);
}
