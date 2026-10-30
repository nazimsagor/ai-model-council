// Sign-in can be switched off (NEXT_PUBLIC_REQUIRE_SIGN_IN=false) so anyone
// can run models with just their own OpenRouter key — no account and no
// subscription. Defaults to on, so a deploy without the variable keeps
// accounts and the lifetime license enforced exactly as before.
export const SIGN_IN_REQUIRED = process.env.NEXT_PUBLIC_REQUIRE_SIGN_IN !== "false";
