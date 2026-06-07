"use client";

import { useEffect, useMemo, useState } from "react";
import { Stars, Badge } from "@/components/ui";
import { useToast } from "@/components/Toast";

const HOODS = ["Kasarani", "Roysambu", "Umoja", "Embakasi", "Kibera", "Westlands",
  "Kilimani", "Karen", "Donholm", "Ruaka", "Kahawa", "South B", "Lavington", "Ngara", "CBD"];

type Worker = {
  matchId: string; workerId: string; name: string; phone: string; trade: string;
  skills: string; neighborhood: string | null; hourlyRate: number; experienceYears: number;
  avgRating: number; ratingCount: number; availableDays?: string[];
  distanceKm: number; matchPercent: number; breakdown: Record<string, number>;
};
type Prediction = { trade: string; confidence: number; ambiguous: boolean; alternatives: string[] };

const SORTS: Record<string, { label: string; cmp: (a: Worker, b: Worker) => number }> = {
  match: { label: "Best match", cmp: (a, b) => b.matchPercent - a.matchPercent },
  distance: { label: "Nearest", cmp: (a, b) => a.distanceKm - b.distanceKm },
  rating: { label: "Top rated", cmp: (a, b) => b.avgRating - a.avgRating },
  price: { label: "Lowest price", cmp: (a, b) => a.hourlyRate - b.hourlyRate },
};

const FACTOR_MAX: Record<string, number> = { skill: 0.4, distance: 0.25, rating: 0.2, completion: 0.15 };
const FACTOR_LABEL: Record<string, string> = {
  skill: "Skill match", distance: "Proximity", rating: "Reputation", completion: "Job history",
};

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function cleanName(n: string) {
  return n.replace(/\s*\(.*?\)\s*$/, "").trim();
}
function initials(n: string) {
  const c = cleanName(n);
  return c.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function scoreTone(p: number) {
  if (p >= 85) return { ring: "ring-acacia/30", text: "text-acacia-dark", bg: "bg-acacia", soft: "bg-acacia-soft" };
  if (p >= 70) return { ring: "ring-gold/40", text: "text-[#9a6b12]", bg: "bg-gold", soft: "bg-gold/15" };
  return { ring: "ring-clay/30", text: "text-clay", bg: "bg-clay", soft: "bg-clay-soft" };
}

export default function ClientDashboard() {
  const { notify } = useToast();
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
  const [sortBy, setSortBy] = useState<keyof typeof SORTS>("match");
  const [selected, setSelected] = useState<Worker | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const sorted = useMemo(
    () => (workers ? [...workers].sort(SORTS[sortBy].cmp) : null),
    [workers, sortBy],
  );

  async function postJob() {
    setBusy(true);
    setError(null);
    setWorkers(null);
    setPred(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j.error ?? "Something went wrong.";
        setError(msg);
        notify("error", msg);
        return;
      }
      const data = await res.json();
      setPred(data.prediction);
      setWorkers(data.workers);
      notify("success", `${data.workers.length} matches found for ${data.prediction.trade}`);
    } catch {
      const msg = "Couldn't reach the server. Check your connection and try again.";
      setError(msg);
      notify("error", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* ---------------- form ---------------- */}
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
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Finding workers…
              </>
            ) : (
              "Find workers"
            )}
          </button>
        </div>

        <p className="mt-4 px-1 text-xs text-muted">
          Tip: the more specific you are (“fix my mabati roof”, “rewire the kitchen”), the
          sharper the match.
        </p>
      </div>

      {/* ---------------- results ---------------- */}
      <div className="lg:col-span-3">
        {/* matching in progress */}
        {busy && (
          <div className="space-y-4">
            <div className="card flex items-center gap-4 p-4">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-acacia/20 border-t-acacia" />
              <div className="flex-1">
                <p className="font-medium">AI matching in progress…</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <span className="block h-full w-2/3 animate-pulse rounded-full bg-acacia" />
                </div>
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* prediction banner */}
        {!busy && pred && (
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

        {/* results header + sort */}
        {!busy && sorted && sorted.length > 0 && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{sorted.length} matches</h2>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort by
              <select
                className="field w-auto py-1.5 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as keyof typeof SORTS)}
              >
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>
        )}

        {/* cards */}
        {!busy && sorted && sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((w, i) => (
              <WorkerCard key={w.matchId} w={w} rank={i + 1} onOpen={() => setSelected(w)} />
            ))}
          </div>
        )}

        {/* empty states */}
        {!busy && workers && workers.length === 0 && (
          <div className="card p-8 text-center text-muted">
            No available {pred?.trade}s found right now. Try a different description.
          </div>
        )}
        {!busy && !workers && (
          <div className="card grid h-full min-h-[320px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-acacia-soft text-xl">🔍</div>
              <p className="font-medium">Your ranked matches will appear here</p>
              <p className="text-sm text-muted">Post a job to see the best fundis near you.</p>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- detail modal ---------------- */}
      {selected && (
        <WorkerModal w={selected} onClose={() => setSelected(null)} onRated={() => notify("success", "Rating submitted — thank you!")} />
      )}
    </div>
  );
}

/* ---------------- inline skeleton (built-in pulse, no custom keyframes) ---------------- */
function SkeletonCard() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-line/70" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-line/70" />
          <div className="h-3 w-56 rounded bg-line/60" />
          <div className="h-3 w-44 rounded bg-line/50" />
        </div>
        <div className="h-14 w-14 rounded-full bg-line/70" />
      </div>
    </div>
  );
}

/* ---------------- compact card ---------------- */
function WorkerCard({ w, rank, onOpen }: { w: Worker; rank: number; onOpen: () => void }) {
  const tone = scoreTone(w.matchPercent);
  return (
    <button
      onClick={onOpen}
      className="card group w-full p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-acacia/10 font-display font-bold text-acacia-dark">
            {initials(w.name)}
          </span>
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display font-semibold">{cleanName(w.name)}</span>
            <Badge>{w.trade}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{w.skills}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>📍 {w.neighborhood} · <b className="text-ink">{w.distanceKm} km</b></span>
            <span>KES {w.hourlyRate}/hr</span>
            <Stars value={w.avgRating} count={w.ratingCount} />
          </div>
        </div>

        <div className="text-center">
          <div className={`grid h-14 w-14 place-items-center rounded-full ring-4 ${tone.ring} ${tone.soft}`}>
            <span className={`font-display text-lg font-bold ${tone.text}`}>{Math.round(w.matchPercent)}%</span>
          </div>
          <span className="mt-1 block text-[11px] text-muted group-hover:text-acacia">View →</span>
        </div>
      </div>
    </button>
  );
}

/* ---------------- score bars ---------------- */
function ScoreBars({ breakdown }: { breakdown: Record<string, number> }) {
  return (
    <div className="space-y-2">
      {Object.entries(breakdown)
        .filter(([k]) => k in FACTOR_MAX)
        .map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-muted">{FACTOR_LABEL[k] ?? k}</span>
            <span className="h-2 flex-1 rounded-full bg-line">
              <span
                className="block h-2 rounded-full bg-acacia transition-all"
                style={{ width: `${Math.min(100, (v / (FACTOR_MAX[k] || 1)) * 100)}%` }}
              />
            </span>
            <span className="w-10 text-right text-muted">{v.toFixed(2)}</span>
          </div>
        ))}
    </div>
  );
}

/* ---------------- detail modal ---------------- */
function WorkerModal({ w, onClose, onRated }: { w: Worker; onClose: () => void; onRated: () => void }) {
  const [stars, setStars] = useState(5);
  const [rated, setRated] = useState(false);
  const [rating, setRating] = useState(false);
  const tone = scoreTone(w.matchPercent);
  const wa = String(w.phone).replace(/[^0-9]/g, "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submitRating() {
    setRating(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: w.matchId, stars }),
      });
      if (res.ok) {
        setRated(true);
        onRated();
      }
    } finally {
      setRating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="animate-fadeUp max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl2 bg-card shadow-lift sm:rounded-xl2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative overflow-hidden border-b border-line p-6">
          <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${tone.soft}`} />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="relative flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-acacia/10 font-display text-xl font-bold text-acacia-dark">
              {initials(w.name)}
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold">{cleanName(w.name)}</h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge>{w.trade}</Badge>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${tone.bg}`}>
                  {Math.round(w.matchPercent)}% match
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* quick stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Rating", w.ratingCount ? w.avgRating.toFixed(1) : "—"],
              ["Distance", `${w.distanceKm} km`],
              ["Rate", `KES ${w.hourlyRate}`],
              ["Exp.", `${w.experienceYears} yr`],
            ].map(([label, val]) => (
              <div key={label} className="rounded-xl bg-paper/70 p-3">
                <p className="font-display text-lg font-bold">{val}</p>
                <p className="text-[11px] text-muted">{label}</p>
              </div>
            ))}
          </div>

          {/* skills */}
          <div>
            <h3 className="mb-2 font-display font-semibold">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {w.skills.split(/,\s*/).map((s) => (
                <span key={s} className="chip chip-on text-xs">{s}</span>
              ))}
            </div>
          </div>

          {/* availability */}
          {w.availableDays && (
            <div>
              <h3 className="mb-2 font-display font-semibold">Availability</h3>
              <div className="flex flex-wrap gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
                  const on = w.availableDays!.includes(d);
                  return (
                    <span key={d} className={`chip text-xs ${on ? "chip-on" : "text-muted/50 line-through"}`}>{d}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* why this match */}
          <div>
            <h3 className="mb-2 font-display font-semibold">Why this match?</h3>
            <ScoreBars breakdown={w.breakdown} />
          </div>

          {/* portfolio — ready to wire once profiles support uploads */}
          <div>
            <h3 className="mb-2 font-display font-semibold">Portfolio &amp; past work</h3>
            <div className="rounded-xl border border-dashed border-line bg-paper/40 p-6 text-center">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-line/60 text-lg">🛠️</div>
              <p className="text-sm text-muted">
                {cleanName(w.name)} hasn&apos;t added portfolio photos or certifications yet.
              </p>
            </div>
          </div>

          {/* actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <a href={`https://wa.me/${wa}`} target="_blank" className="btn-clay flex-1">WhatsApp</a>
            <a href={`tel:${w.phone}`} className="btn-ghost flex-1">Call</a>
          </div>

          {/* rating */}
          <div className="flex items-center gap-2 rounded-xl bg-paper/70 p-3">
            <span className="text-sm text-muted">Worked with them? Rate:</span>
            <select
              className="field w-auto py-1"
              value={stars}
              onChange={(e) => setStars(Number(e.target.value))}
              disabled={rated}
            >
              {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} ★</option>)}
            </select>
            <button className="btn-primary py-1.5 text-sm" onClick={submitRating} disabled={rated || rating}>
              {rated ? "Thanks!" : rating ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
