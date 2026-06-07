import Link from "next/link";
import { Logo } from "@/components/ui";

const TRADES = [
  "Plumbers", "Electricians", "Masons", "Painters", "Welders",
  "Carpenters", "Cleaners", "Drivers", "Solar installers", "Appliance repair",
];

const STATS = [
  { value: "8", label: "Trades covered" },
  { value: "15", label: "Nairobi neighbourhoods" },
  { value: "4", label: "Ranking signals" },
  { value: "100%", label: "Explainable scores" },
];

// pipeline stages for the architecture diagram
const STAGES = [
  { icon: "📝", title: "Describe", sub: "plain words", tech: "In Your Words", fill: "#1F1B16" },
  { icon: "🧠", title: "Detect trade", sub: "AI model", tech: "Understands Intent", fill: "#C65A2E" },
  { icon: "🗄️", title: "Find fundis", sub: "of that trade", tech: "verified profiles", fill: "#1A6B45" },
  { icon: "📊", title: "Score & rank", sub: "4 signals", tech: "Transparent Scoring", fill: "#D9A441" },
  { icon: "🤝", title: "Hire", sub: "top matches", tech: "Instant Contact", fill: "#124E33" },
];

const WEIGHTS = [
  { label: "Skill match", pct: 40, color: "bg-acacia" },
  { label: "Proximity", pct: 25, color: "bg-clay" },
  { label: "Reputation", pct: 20, color: "bg-gold" },
  { label: "Job history", pct: 15, color: "bg-ink" },
];

export default function Home() {
  return (
    <div>
      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-ink/70 hover:text-ink">Log in</Link>
            <Link href="/register" className="btn-primary text-sm">Get started</Link>
          </nav>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-acacia-soft blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-clay-soft blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-12 pt-10 md:grid-cols-2 md:pt-16">
          <div className="animate-fadeUp">
            <span className="chip chip-on mb-5 inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acacia opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-acacia" />
              </span>
              AI-powered matching · Nairobi
            </span>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Find a trusted <span className="text-acacia">fundi</span> near you, fast.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Describe the job in plain words — “leaking pipe in Kasarani” — and Kazi Connect
              ranks the best-matched workers by skill, distance and reputation.
            </p>

            {/* decorative search → register */}
            <div className="card mt-8 flex flex-col gap-2 p-2 sm:flex-row">
              <div className="relative flex-1">
                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  readOnly
                  placeholder='e.g. "fix water heater in Westlands"'
                  className="w-full rounded-xl border-0 bg-paper py-3 pl-11 pr-4 text-ink placeholder:text-muted/70 focus:outline-none"
                />
              </div>
              <Link href="/register" className="btn-primary justify-center">Find a fundi</Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
              <Link href="/register" className="hover:text-acacia">Hire a worker →</Link>
              <span className="text-line">•</span>
              <Link href="/register" className="hover:text-acacia">Offer your skills →</Link>
            </div>
          </div>

          {/* match-preview card */}
          <div className="animate-fadeUp" style={{ animationDelay: "120ms" }}>
            <div className="card overflow-hidden p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-muted">Job request</p>
                <span className="chip chip-on text-xs">live match</span>
              </div>
              <p className="font-display text-lg font-semibold">
                “Need a plumber in Kasarani to fix a leaking pipe. Urgent!”
              </p>
              <div className="my-4 h-px bg-line" />
              <p className="mb-3 text-sm font-semibold">Top matches</p>
              <div className="space-y-2">
                {[
                  { name: "Otieno", match: 94, distance: "2.1 km", rating: 4.8, jobs: 127, tone: "bg-acacia" },
                  { name: "Wanjiku", match: 89, distance: "4.7 km", rating: 4.6, jobs: 89, tone: "bg-acacia" },
                  { name: "Kamau", match: 85, distance: "6.0 km", rating: 4.9, jobs: 64, tone: "bg-gold" },
                ].map((w) => (
                  <div key={w.name} className="flex items-center justify-between rounded-xl border border-line bg-card p-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-acacia/10 font-display font-bold text-acacia-dark">
                        {w.name[0]}
                      </span>
                      <div>
                        <p className="font-semibold">{w.name}</p>
                        <p className="text-xs text-muted">{w.jobs} jobs done</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted">{w.distance}</span>
                      <span className="text-gold">★ <span className="text-ink">{w.rating}</span></span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${w.tone}`}>{w.match}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>⚡ Ranked in under a second</span>
                <span>📱 Contact via WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- trades ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap justify-center gap-2">
          {TRADES.map((t) => <span key={t} className="chip text-muted">{t}</span>)}
        </div>
      </section>

      {/* ---------- stats ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <div className="font-display text-3xl font-bold text-acacia md:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- system architecture diagram ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">How the system works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            Every request moves through five stages — from your plain-language description to a
            ranked shortlist of fundis you can contact in seconds.
          </p>
        </div>

        <div className="card overflow-x-auto p-6">
          <svg viewBox="0 0 920 230" className="mx-auto block min-w-[680px] max-w-full" role="img" aria-label="Kazi Connect request pipeline">
            {STAGES.map((s, i) => {
              const x = 20 + i * 180;
              return (
                <g key={s.title}>
                  {i < STAGES.length - 1 && (
                    <line x1={x + 150} y1={128} x2={x + 180} y2={128} stroke="#E6DFD1" strokeWidth={3} markerEnd="url(#arrow)" />
                  )}
                  <rect x={x} y={80} width={150} height={96} rx={16} fill="#FFFFFF" stroke="#E6DFD1" strokeWidth={1.5} />
                  <circle cx={x + 75} cy={112} r={22} fill={s.fill} opacity={0.12} />
                  <text x={x + 75} y={120} textAnchor="middle" fontSize={22}>{s.icon}</text>
                  <text x={x + 75} y={150} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1F1B16">{s.title}</text>
                  <text x={x + 75} y={168} textAnchor="middle" fontSize={11.5} fill="#857C6E">{s.sub}</text>
                  <text x={x + 75} y={202} textAnchor="middle" fontSize={11} fill={s.fill} fontWeight={600}>{s.tech}</text>
                </g>
              );
            })}
            <text x={20} y={40} fontSize={14} fill="#857C6E">Your request → AI understanding → mMtching → Ranking → Results</text>
            <defs>
              <marker id="arrow" markerWidth={10} markerHeight={10} refX={7} refY={3} orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L7,3 L0,6 Z" fill="#C65A2E" />
              </marker>
            </defs>
          </svg>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          The AI is used only to understand the job — it never sees your personal account details.
          Every match score is fully transparent and can be explained, factor by factor.
        </p>
      </section>

      {/* ---------- scoring weights ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="card p-6 md:p-8">
          <h3 className="font-display text-xl font-semibold">How the match score is calculated</h3>
          <p className="mt-1 text-sm text-muted">
            Four signals, transparently weighted — no black box. Every worker can see exactly why
            they ranked where they did.
          </p>
          <div className="mt-6 flex h-5 w-full overflow-hidden rounded-full">
            {WEIGHTS.map((w) => (
              <div key={w.label} className={`${w.color} h-full`} style={{ width: `${w.pct}%` }} title={`${w.label} ${w.pct}%`} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WEIGHTS.map((w) => (
              <div key={w.label} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-sm ${w.color}`} />
                <span className="text-sm"><b>{w.pct}%</b> <span className="text-muted">{w.label}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- how it works (steps) ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { num: "01", title: "Describe the job", desc: "Type what you need in everyday language. The AI works out the trade and urgency.", icon: "📝" },
            { num: "02", title: "Get ranked matches", desc: "Nearby workers are scored on skill, distance, rating and history — instantly.", icon: "🎯" },
            { num: "03", title: "Hire & rate", desc: "Reach your pick on WhatsApp. After the job, rate them to help the community.", icon: "⭐" },
          ].map((s, i) => (
            <div key={s.num} className="card animate-fadeUp p-6" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-acacia-soft text-xl">{s.icon}</span>
                <span className="font-display text-3xl font-black text-line">{s.num}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- dual-audience value ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-7">
            <span className="chip chip-on mb-3">For clients</span>
            <h3 className="font-display text-2xl font-bold">Hire with confidence</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {["Plain-language search — no forms or jargon",
                "See why each fundi was matched, factor by factor",
                "Nearest, top-rated or best-value — you choose the sort",
                "Reach your pick directly on WhatsApp"].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-0.5 text-acacia">✓</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <span className="chip mb-3 border-clay/40 bg-clay-soft text-clay">For fundis</span>
            <h3 className="font-display text-2xl font-bold">Get found for the right jobs</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {["Matched to nearby jobs in your actual trade",
                "A fairness boost so new workers still get seen",
                "Build a rating that lifts you up the rankings",
                "Tips that show exactly how to improve your score"].map((t) => (
                <li key={t} className="flex items-start gap-2"><span className="mt-0.5 text-clay">✓</span><span>{t}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="card relative overflow-hidden bg-acacia p-10 text-center md:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-white/10" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Ready to find your next fundi?</h2>
            <p className="mx-auto mt-3 max-w-md text-acacia-soft">Join Kazi Connect today — it&apos;s free to get started.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn bg-white text-acacia-dark hover:bg-paper">Hire a fundi</Link>
              <Link href="/register" className="btn border-2 border-white/70 text-white hover:bg-white/10">Offer your skills</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="mx-auto max-w-6xl px-6 py-12">
        <div className="h-px bg-line" />
        <div className="grid grid-cols-1 gap-8 pt-8 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted">Connecting Nairobi with trusted fundis through transparent, AI-powered matching.</p>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/register" className="hover:text-acacia">Get started</Link></li>
              <li><Link href="/login" className="hover:text-acacia">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/help" className="hover:text-acacia">Help centre</Link></li>
              <li><Link href="/safety" className="hover:text-acacia">Safety tips</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/privacy" className="hover:text-acacia">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-acacia">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-line pt-6 text-center text-sm text-muted">
          Kazi Connect — proudly Kenyan.
        </div>
      </footer>
    </div>
  );
}
