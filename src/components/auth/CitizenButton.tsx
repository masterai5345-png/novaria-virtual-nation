"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function CitizenButton() {
  const { data: session, status } = useSession();
  const [message, setMessage] = useState("");

  if (status === "loading") {
    return <button className="citizen-button" type="button" disabled>Checking citizen status…</button>;
  }

  if (session?.user) {
    return (
      <div className="citizen-account">
        <span className="citizen-account-name">{session.user.name || session.user.email}</span>
        <button className="citizen-button" type="button" onClick={() => signOut({ redirectTo: "/" })}>
          Sign out
        </button>
      </div>
    );
  }

  const enabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  return (
    <div className="citizen-signin">
      <button
        className="citizen-button"
        type="button"
        disabled={!enabled}
        title={enabled ? "Sign in with Google" : "Google login requires server configuration"}
        onClick={async () => {
          setMessage("");
          try {
            await signIn("google", { redirectTo: "/citizen" });
          } catch {
            setMessage("Google sign-in is not configured yet. Please try again later.");
          }
        }}
      >
        {enabled ? "Become a citizen" : "Citizen login coming soon"}
      </button>
      {message ? <span className="signin-message" role="status">{message}</span> : null}
    </div>
  );
}
