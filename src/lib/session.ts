import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "council_visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Anonymous per-browser session id — no login required. Used only to keep
 *  each visitor's council history private to them.
 *
 *  Reading a cookie is always allowed; writing one is only allowed from a
 *  Route Handler or Server Action, not a plain Server Component render. A
 *  brand-new visitor hitting a Server Component first (e.g. loading a
 *  history detail link directly) has no rows yet regardless, so silently
 *  skipping the write there is harmless — the very next API call sets it. */
export async function getVisitorId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = randomUUID();
  try {
    store.set(COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
    });
  } catch {
    // Called from a Server Component render — cookies are read-only there.
  }
  return id;
}
