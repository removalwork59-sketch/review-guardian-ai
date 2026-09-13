/**
 * Structured one-line JSON logs (collected by journald on the VPS). Callers pass identifiers and
 * measurements only — never tokens, keys, review text or personal data.
 */
type Field = string | number | boolean | null | undefined;

export function logEvent(
  event: string,
  fields: Record<string, Field> = {},
  level: "info" | "warn" | "error" = "info",
) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function timed<T>(
  event: string,
  fields: Record<string, Field>,
  task: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await task();
    logEvent(event, { ...fields, ok: true, ms: Date.now() - started });
    return result;
  } catch (error) {
    logEvent(
      event,
      {
        ...fields,
        ok: false,
        ms: Date.now() - started,
        error: error instanceof Error ? error.message.slice(0, 160) : "error",
      },
      "warn",
    );
    throw error;
  }
}
