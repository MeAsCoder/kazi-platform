"use client";

import { useState } from "react";
import { Stars, Badge } from "@/components/ui";

const HOODS = ["Kasarani", "Roysambu", "Umoja", "Embakasi", "Kibera", "Westlands",
  "Kilimani", "Karen", "Donholm", "Ruaka", "Kahawa", "South B", "Lavington", "Ngara", "CBD"];

type Worker = {
  matchId: string; workerId: string; name: string; phone: string; trade: string;
  skills: string; neighborhood: string | null; hourlyRate: number; experienceYears: number;
  avgRating: number; ratingCount: number; distanceKm: number; matchPercent: number;
  breakdown: Record<string, number>;
};
type Prediction = { trade: string; confidence: number; ambiguous: boolean; alternatives: string[] };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function ClientDashboard() {
  const [form, setForm] = useState({
    title: "Leaking pipe repair",
    description: "Need a plumber in Kasarani to fix a leaking pipe tomorrow morning.",
    neighborhood: "Kasarani",
    requiredDate: tomorrow(),
  });
  const [pred, setPred] = useState<Prediction | null>(null);
  const [workers, setWorkers] = useState<Worker[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function postJob() {
    setBusy(true);
    setError(null);
    setWorkers(null);
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    setPred(data.prediction);
    setWorkers(data.workers);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* form */}
      <div className="lg:col-span-2">
        <h1 className="font-display text-3xl font-bold">Post a job</h1>
        <p className="mb-5 text-muted">Describe it in plain words — we&apos;ll find the right fundi.</p>
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Job title</label>
            <input className="field" value={form.title} onChange={set("title")} />
          </div>
          <div>
            <label className="label">Describe the job</label>
            <textarea className="field" rows={3} value={form.description} onChange={set("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Neighborhood</label>
              <select className="field" value={form.neighborhood} onChange={set("neighborhood")}>
                {HOODS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date needed</label>
              <input type="date" className="field" value={form.requiredDate} onChange={set("requiredDate")} />
            </div>
          </div>
          {error && <p className="text-sm text-clay">{error}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={postJob}>
            {busy ? "Finding workers…" : "Find workers"}
          </button>
        </div>
      </div>

      {/* results */}
      <div className="lg:col-span-3">
        {pred && (
          <div className={`mb-4 rounded-xl border p-4 ${pred.ambiguous ? "border-clay/40 bg-clay-soft" : "border-acacia/30 bg-acacia-soft"}`}>
            {pred.ambiguous ? (
              <p className="text-sm">
                Detected <b>{pred.trade}</b> ({Math.round(pred.confidence * 100)}% sure) — could also be{" "}
                <b>{pred.alternatives.join(" or ")}</b>. Try naming the task more specifically.
              </p>
            ) : (
              <p className="text-sm">
                Detected trade: <b>{pred.trade}</b> · {Math.round(pred.confidence * 100)}% confidence
              </p>
            )}
          </div>
        )}

        {workers && workers.length === 0 && (
          <div className="card p-8 text-center text-muted">
            No available {pred?.trade}s found right now. Try a different description.
          </div>
        )}

        {workers && workers.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-xl font-semibold">Top {workers.length} matches</h2>
            {workers.map((w, i) => (
              <WorkerCard key={w.matchId} w={w} rank={i + 1} />
            ))}
          </div>
        )}

        {!workers && !busy && (
          <div className="card grid h-full min-h-[300px] place-items-center p-8 text-center text-muted">
            Your ranked matches will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

function WorkerCard({ w, rank }: { w: Worker; rank: number }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [rated, setRated] = useState(false);

  async function rate() {
    const res = await fetch("/api/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: w.matchId, stars }),
    });
    if (res.ok) setRated(true);
  }

  const wa = String(w.phone).replace(/[^0-9]/g, "");
  const maxes: Record<string, number> = { skill: 0.4, distance: 0.25, rating: 0.2, completion: 0.15 };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">
              {rank}
            </span>
            <span className="font-display font-semibold">{w.name}</span>
            <Badge>{w.trade}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">{w.skills}</p>
          <p className="mt-1 text-sm text-muted">
            📍 {w.neighborhood} · <b>{w.distanceKm} km</b> · KES {w.hourlyRate}/hr · {w.experienceYears} yrs
          </p>
          <div className="mt-1">
            <Stars value={w.avgRating} count={w.ratingCount} />
          </div>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-acacia px-3 py-1 text-sm font-bold text-white">
            {Math.round(w.matchPercent)}%
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <a href={`https://wa.me/${wa}`} target="_blank" className="btn-clay text-sm">
          WhatsApp
        </a>
        <button className="text-sm font-medium text-acacia hover:underline" onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Why this match?"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 rounded-xl bg-paper/70 p-4">
          {Object.entries(w.breakdown).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 text-sm">
              <span className="w-24 capitalize text-muted">{k}</span>
              <span className="h-2 flex-1 rounded-full bg-line">
                <span
                  className="block h-2 rounded-full bg-acacia"
                  style={{ width: `${Math.min(100, (v / (maxes[k] || 1)) * 100)}%` }}
                />
              </span>
              <span className="w-10 text-right text-muted">{v.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-muted">Rate after the job:</span>
            <select className="field w-auto py-1" value={stars} onChange={(e) => setStars(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} ★</option>)}
            </select>
            <button className="btn-ghost py-1 text-sm" onClick={rate} disabled={rated}>
              {rated ? "Thanks!" : "Submit rating"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
