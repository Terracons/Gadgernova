"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "@/app/actions/admin";
import { store } from "@/store.config";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    login,
    null,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <form
        action={formAction}
        className="a-card"
        style={{ width: "100%", maxWidth: 350, margin: 0, padding: 30 }}
      >
        <div className="admin-brand" style={{ padding: 0 }}>
          {store.name}
        </div>
        <div className="admin-tag" style={{ padding: "2px 0 18px" }}>
          {store.tagline}
        </div>

        {state?.message && !state.ok && (
          <div className="a-alert bad">{state.message}</div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required autoFocus />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <button className="a-btn block" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
