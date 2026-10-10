import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Field, fieldClass } from "@/components/app/form-primitives";
import { Button } from "@/components/ui/button";
import { useDemoData } from "@/hooks/useDemoData";
import { acceptInvitation, invitationByToken } from "@/lib/domain/accounts";
import { repository, staffDisplayName } from "@/lib/domain/repository";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your portal account — FredFit Portal" },
      {
        name: "description",
        content:
          "Accept your Fredericksburg Fitness Studio staff invitation and create your portal sign-in.",
      },
      { property: "og:title", content: "Create your portal account — FredFit Portal" },
      {
        property: "og:description",
        content: "Invitation-only account creation for FFS staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  useDemoData();
  const { token } = Route.useParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const invite = invitationByToken(token);
  const staff = invite ? repository.getStaff(invite.staffId) : undefined;

  const submit = () => {
    setError(null);
    if (password.length < 8) {
      setError("Choose a password of at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    const result = acceptInvitation(token, password);
    if (!result.ok) {
      setError(result.reason ?? "This invitation could not be used.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="surface-card p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Fredericksburg Fitness Studio
        </p>
        {!invite || !staff ? (
          <>
            <h1 className="mt-2 text-xl font-semibold text-foreground">Invitation not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This link is not valid. Ask Jennifer or Jessie to send a new invitation.
            </p>
          </>
        ) : done ? (
          <>
            <h1 className="mt-2 text-xl font-semibold text-foreground">Your account is ready</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {staffDisplayName(staff)}, your sign-in is now connected to your existing staff
              profile. Nothing was duplicated.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">
              Go to the portal
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-xl font-semibold text-foreground">
              Create your portal account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Welcome, {staffDisplayName(staff)}. Choose a password to finish setting up access for{" "}
              {invite.email}.
            </p>

            <div className="mt-6 space-y-4">
              <Field label="Password">
                <input
                  type="password"
                  className={fieldClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Confirm password">
                <input
                  type="password"
                  className={fieldClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" onClick={submit}>
                Create account
              </Button>
              <p className="text-xs text-muted-foreground">
                Accounts are invitation-only. Nobody can register themselves for the FFS portal.
                Password handling is simulated at this stage of development.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
