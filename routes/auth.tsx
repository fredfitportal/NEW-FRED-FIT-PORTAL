import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";

import ffsLogo from "@/assets/ffs-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff sign in — FredFit Portal" },
      {
        name: "description",
        content: "Secure staff sign in for the Fredericksburg Fitness Studio portal.",
      },
      { property: "og:title", content: "Staff sign in — FredFit Portal" },
      {
        property: "og:description",
        content: "Invitation-only staff access for Fredericksburg Fitness Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) {
      setError("The email or password is incorrect, or this account has not been invited.");
      return;
    }
    await navigate({ to: "/" });
  };

  const sendReset = async () => {
    setError(null);
    setNotice(null);
    const address = email.trim();
    if (!address) {
      setError("Enter your email address first, then choose Forgot password.");
      return;
    }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setNotice(
      "If that email belongs to a staff account, a password reset link is on its way. The link expires shortly.",
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-sm">
        <img
          src={ffsLogo}
          alt="Fredericksburg Fitness Studio"
          className="mx-auto h-16 w-auto max-w-56 object-contain"
        />
        <div className="mt-8 border-t border-border pt-7">
          <h1 className="text-center text-3xl font-semibold text-foreground">Staff sign in</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Use the individual account linked to your staff profile.
          </p>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                />
              </span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Password</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9"
                />
              </span>
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={sendReset}
              disabled={busy}
              className="block w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
            >
              Forgot password?
            </button>
          </form>


          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            Access is invitation-only. Contact Jennifer or Jessie if you need an account.
          </p>
        </div>
      </section>
    </main>
  );
}