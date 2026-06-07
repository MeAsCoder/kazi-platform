"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/ui";

const HOODS = ["Kasarani", "Roysambu", "Umoja", "Embakasi", "Kibera", "Westlands",
  "Kilimani", "Karen", "Donholm", "Ruaka", "Kahawa", "South B", "Lavington", "Ngara", "CBD"];
const TRADES = ["plumber", "electrician", "mason", "painter", "welder", "carpenter", "cleaner", "driver"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Role = "CLIENT" | "WORKER";

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("CLIENT");
  const [f, setF] = useState({
    name: "", phone: "", password: "", neighborhood: "Kasarani",
    trade: "plumber", skills: "", experienceYears: 1, hourlyRate: 500,
  });
  const [days, setDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const toggleDay = (d: string) =>
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  async function submit() {
    setBusy(true);
    setError(null);
    const body = {
      ...f,
      role,
      experienceYears: Number(f.experienceYears),
      hourlyRate: Number(f.hourlyRate),
      availableDays: days,
    };
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Could not register.");
      setBusy(false);
      return;
    }
    await signIn("credentials", { phone: f.phone.trim(), password: f.password, redirect: false });
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-6">
        <Logo />
      </Link>
      <div className="card p-7">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>

        {/* role toggle */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper/70 p-1">
          {(["CLIENT", "WORKER"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                role === r ? "bg-acacia text-white shadow-card" : "text-ink/70 hover:text-ink"
              }`}
            >
              {r === "CLIENT" ? "I need a worker" : "I'm a worker"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input className="field" value={f.name} onChange={set("name")} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="field" value={f.phone} onChange={set("phone")} placeholder="+2547..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password</label>
              <input type="password" className="field" value={f.password} onChange={set("password")} />
            </div>
            <div>
              <label className="label">Neighborhood</label>
              <select className="field" value={f.neighborhood} onChange={set("neighborhood")}>
                {HOODS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* worker-only fields */}
          {role === "WORKER" && (
            <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Trade</label>
                  <select className="field" value={f.trade} onChange={set("trade")}>
                    {TRADES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Rate (KES/hr)</label>
                  <input type="number" className="field" value={f.hourlyRate} onChange={set("hourlyRate")} />
                </div>
              </div>
              <div>
                <label className="label">Skills (comma separated)</label>
                <input className="field" value={f.skills} onChange={set("skills")}
                  placeholder="leak repair, drainage, water tanks" />
              </div>
              <div>
                <label className="label">Years of experience</label>
                <input type="number" className="field" value={f.experienceYears} onChange={set("experienceYears")} />
              </div>
              <div>
                <span className="label">Available days</span>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`chip ${days.includes(d) ? "chip-on" : "text-muted"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-clay">{error}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={submit}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-acacia hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
