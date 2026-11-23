/**
 * Mask the password in Postgres connection strings before a CLI prints them.
 *
 * A Lakebase DSN carries a live OAuth token as its password (valid about an
 * hour). Commands like `lakebase-branch sync-env` return the DSN so library
 * callers can use it; printing it puts a working credential on screen, in
 * terminal scrollback, CI logs, and anything pasted from them.
 *
 * Only the password is replaced: user, host, port, database and query stay, so
 * the output still shows which branch and database `.env` now points at.
 */

export const REDACTED = "***";

// scheme://user:password@ ; the password is percent-encoded, so it holds no '@'
// or '/'. The user part may be empty.
const DSN_PASSWORD = /(postgres(?:ql)?:\/\/[^:@/\s]*:)[^@/\s]+@/gi;

/** Replace the password in every Postgres URL inside `text`. */
export function redactDsnPasswords(text: string): string {
  return text.replace(DSN_PASSWORD, `$1${REDACTED}@`);
}

/**
 * Deep copy of `value` with DSN passwords masked in every string. Plain objects
 * and arrays are walked; other values are returned as-is. The input is never
 * mutated, so callers can still use the real DSN.
 */
export function redactDsnSecrets<T>(value: T): T {
  if (typeof value === "string") return redactDsnPasswords(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDsnSecrets(v)) as unknown as T;
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDsnSecrets(v);
    return out as T;
  }
  return value;
}
