"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User, EnvelopeSimple, AppleLogo, GooglePlayLogo, SignOut, Trash, Check,
  CircleNotch, LockSimple,
} from "@phosphor-icons/react";
import { supabase, API_URL } from "@/lib/supabase";
import { Wordmark } from "@/components/Wordmark";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  tier: string;
};

function toSessionUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> }): SessionUser {
  return {
    id: u.id,
    email: u.email ?? "",
    name: (u.user_metadata?.name as string) ?? u.email ?? "",
    tier: (u.user_metadata?.tier as string) ?? "trial",
  };
}

export default function AccountPage() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  // login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  // delete flow
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? toSessionUser(session.user) : null);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? toSessionUser(session.user) : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoggingIn(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError(err.message);
    setLoggingIn(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setConfirmingDelete(false);
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");
      const resp = await fetch(`${API_URL}/api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Could not delete the account.");
      }
      await supabase.auth.signOut();
      setConfirmingDelete(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account.");
    } finally {
      setDeleting(false);
    }
  }

  const isPro = user?.tier === "pro";

  return (
    <>
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-16 max-w-[760px] items-center justify-between px-5">
          <Link href="/" aria-label="Dialed home"><Wordmark withMark /></Link>
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] px-5 py-16">
        {checking ? (
          <div className="flex justify-center py-24" role="status" aria-label="Loading account">
            <CircleNotch size={28} className="animate-spin text-accent" />
          </div>
        ) : !user ? (
          /* ── Signed out: log in with the same account as the app ────── */
          <>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
              Your account
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Sign in with the same email and password you use in the Dialed app.
            </p>
            <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="rounded-xl border border-hairline bg-surface px-4 py-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
                  placeholder="you@school.edu"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="rounded-xl border border-hairline bg-surface px-4 py-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
                  placeholder="Your password"
                />
              </label>
              {error && (
                <p className="rounded-xl bg-cold/10 px-4 py-3 text-sm text-cold" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loggingIn}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-[15px] font-medium text-white transition-all hover:bg-accent-press active:scale-[0.98] disabled:opacity-60"
              >
                {loggingIn ? <CircleNotch size={17} className="animate-spin" /> : <LockSimple size={16} weight="fill" />}
                {loggingIn ? "Signing in" : "Sign in"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted">
              No account yet? Create one in the app first.
            </p>
          </>
        ) : (
          /* ── Signed in: account dashboard ─────────────────────────────── */
          <>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
              Your account
            </h1>

            {/* profile */}
            <section className="mt-8 flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-6 shadow-card">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-tint">
                <User size={22} className="text-accent" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold text-ink">{user.name}</span>
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <EnvelopeSimple size={13} /> {user.email}
                </span>
              </span>
            </section>

            {/* plan */}
            <section className="mt-4 rounded-2xl border border-hairline bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">Plan</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${isPro ? "bg-accent" : "bg-warn"}`}>
                  {isPro ? "DIALED PRO" : "TRIAL"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isPro
                  ? "Your subscription is active. Full access to nudges, AI replies, Gmail detection, and analytics."
                  : "You have full access during your trial. Your subscription activates through the app when the trial ends."}
              </p>
            </section>

            {/* subscription management */}
            <section className="mt-4 rounded-2xl border border-hairline bg-surface p-6 shadow-card">
              <h2 className="text-base font-bold text-ink">Manage subscription</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Billing runs through your app store, so upgrades, plan changes, and
                cancellation happen there. Changes take effect immediately.
              </p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <a
                  href="https://apps.apple.com/account/subscriptions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <AppleLogo size={16} weight="fill" /> App Store subscriptions
                </a>
                <a
                  href="https://play.google.com/store/account/subscriptions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <GooglePlayLogo size={15} weight="fill" /> Google Play subscriptions
                </a>
              </div>
            </section>

            {/* sign out + danger zone */}
            <section className="mt-4 rounded-2xl border border-hairline bg-surface p-6 shadow-card">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-hairline py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              >
                <SignOut size={16} /> Sign out
              </button>

              <div className="mt-6 border-t border-hairline pt-6">
                <h2 className="text-base font-bold text-cold">Delete account</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Permanently erases your account and everything in it: contacts,
                  notes, email records, and reminders. This cannot be undone.
                </p>
                {error && (
                  <p className="mt-3 rounded-xl bg-cold/10 px-4 py-3 text-sm text-cold" role="alert">
                    {error}
                  </p>
                )}
                {!confirmingDelete ? (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="mt-4 flex items-center justify-center gap-2 rounded-full border border-cold/40 px-5 py-2.5 text-sm font-medium text-cold transition-colors hover:bg-cold/5"
                  >
                    <Trash size={15} /> Delete my account
                  </button>
                ) : (
                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cold py-3 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                    >
                      {deleting ? <CircleNotch size={15} className="animate-spin" /> : <Check size={15} weight="bold" />}
                      {deleting ? "Deleting" : "Yes, delete everything"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="flex flex-1 items-center justify-center rounded-full border border-hairline py-3 text-sm font-medium text-ink transition-colors hover:border-accent"
                    >
                      Keep my account
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[560px] items-center gap-5 px-5 py-6 text-xs text-faint">
          <span>© {new Date().getFullYear()} Dialed</span>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <Link href="/support" className="underline">Support</Link>
        </div>
      </footer>
    </>
  );
}
