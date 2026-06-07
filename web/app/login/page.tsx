"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/ui";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      phone: phone.trim(),
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Wrong phone or password.");
      return;
    }
    // /dashboard reads the role server-side and forwards to the right area.
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="card p-7">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-muted">Log in to your Kazi Connect account.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Phone number</label>
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2547..." />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {error && <p className="text-sm text-clay">{error}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={submit}>
            {busy ? "Signing in…" : "Log in"}
          </button>
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-acacia hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
