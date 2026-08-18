"use server";

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase/authServer";

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function toLoginUrl(mode: "signin" | "signup", next: string, params: Record<string, string>) {
  const search = new URLSearchParams({ mode, next, ...params });
  return `/login?${search.toString()}`;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    redirect(toLoginUrl("signin", next, { error: "Enter your email and password." }));
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(toLoginUrl("signin", next, { error: error.message }));
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    redirect(toLoginUrl("signup", next, { error: "Enter your email and password." }));
  }
  if (password.length < 8) {
    redirect(toLoginUrl("signup", next, { error: "Password must be at least 8 characters." }));
  }

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(toLoginUrl("signup", next, { error: error.message }));
  }

  if (!data.session) {
    redirect(toLoginUrl("signin", next, { notice: "Check your email to confirm your account, then sign in." }));
  }

  redirect(next);
}

export async function signOutAction() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
