import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";

import ffsLogo from "@/assets/ffs-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — FredFit Portal" },
      {
        name: "description",
        content: "Choose a new password for your Fredericksburg Fitness Studio staff account.",
      },
      { property: "og:title", content: "Set a new password — FredFit Portal" },
      {
        property: "og:description",
        content: "Secure password reset for Fredericksburg Fitness Studio staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      void navigate({ to: "/" });
    }, 1200);
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
          <h1 className="text-center text-3xl font-semibold text-foreground">New password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {done
              ? "Your password has been updated."
              : ready
                ? "Choose a password you have not used before."
                : "Open this page from the reset link in your email."}
          </p>

          {!done && ready ? (
            <form className="mt-7 space-y-4" onSubmit={submit}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">New password</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9"
                  />
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Confirm password</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="pl-9"
                  />
                </span>
              </label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
