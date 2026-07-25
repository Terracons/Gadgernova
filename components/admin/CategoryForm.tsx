"use client";

import { useActionState } from "react";
import { saveCategory, type ActionResult } from "@/app/actions/admin";

export default function CategoryForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveCategory,
    null,
  );

  return (
    <div className="a-card">
      <h2>Add category</h2>

      {state?.message && (
        <div className={`a-alert ${state.ok ? "good" : "bad"}`}>
          {state.message}
        </div>
      )}

      {/* key resets the inputs after a successful save */}
      <form action={formAction} key={state?.ok ? Math.random() : "form"}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="name">Name *</label>
          <input id="name" name="name" required placeholder="Laptops" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={2} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="position">Sort position</label>
          <input id="position" name="position" type="number" defaultValue={0} />
          <p className="a-muted" style={{ fontSize: 12, margin: "5px 0 0" }}>
            Lower numbers appear first.
          </p>
        </div>

        <button className="a-btn" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add category"}
        </button>
      </form>
    </div>
  );
}
