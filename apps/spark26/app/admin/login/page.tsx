"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (res.status === 429) setError("Too many attempts. Try again later.");
      else setError("Incorrect password.");
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl">Admin sign-in</h1>
        <label className="block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            className="mt-1 w-full rounded-md border border-[var(--color-navy-line)] bg-transparent px-3 py-2"
          />
        </label>
        {error && (
          <p className="text-sm text-[var(--color-gold-100)]">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="w-full rounded-md bg-[var(--color-blue)] px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
