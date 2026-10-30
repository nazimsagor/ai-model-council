import { cookies } from "next/headers";
import { SIGN_IN_REQUIRED } from "./authMode";
import { getCurrentUser } from "./subscription";

export const VISITOR_COOKIE = "bohumot_visitor";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who a run belongs to — scopes every history read/write. */
export interface RunOwner {
  column: "user_id" | "visitor_id";
  id: string;
}

/** The signed-in user, or — with sign-in switched off — the anonymous
 *  visitor cookie. Null when neither applies (signed out, sign-in on). */
export async function getRunOwner(): Promise<RunOwner | null> {
  const user = await getCurrentUser();
  if (user) return { column: "user_id", id: user.id };
  if (SIGN_IN_REQUIRED) return null;
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  return visitorId && UUID_RE.test(visitorId) ? { column: "visitor_id", id: visitorId } : null;
}

/** A fresh anonymous owner plus the Set-Cookie header that remembers it,
 *  so this browser's runs show up in its own Recent Work and History. */
export function newVisitorOwner(): { owner: RunOwner; setCookie: string } {
  const id = crypto.randomUUID();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    owner: { column: "visitor_id", id },
    setCookie: `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${VISITOR_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  };
}
