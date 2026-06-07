import Link from "next/link";
import { Logo } from "@/components/ui";

const TRADES = ["Plumbers", "Electricians", "Masons", "Painters", "Welders", "Carpenters", "Cleaners", "Drivers"];

export default function Home() {
  return (
    <div>
      {/* top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-ink/70 hover:text-ink">
            Log in
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Get started
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-10 md:pt-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="chip chip-on mb-5">AI-matched · Nairobi</span>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Find a trusted{" "}
              <span className="text-acacia">fundi</span> near you, fast.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Describe the job in plain words — “leaking pipe in Kasarani” — and our model
              ranks the best-matched workers by skill, distance and reputation.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Hire a worker
              </Link>
              <Link href="/register" className="btn-ghost">
                Offer your skills
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              Already here?{" "}
              <Link href="/login" className="font-medium text-acacia underline-offset-2 hover:underline">
                Log in
              </Link>
            </p>
          </div>

          {/* illustrative match card */}
          <div className="card relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-acacia-soft" />
            <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-clay-soft" />
            <div className="relative">
              <p className="text-sm text-muted">Request</p>
              <p className="font-display text-lg font-semibold">
                “Need a plumber in Kasarani to fix a leaking pipe.”
              </p>
              <div className="my-4 h-px bg-line" />
              <p className="mb-3 text-sm text-muted">Top match</p>
              {[
                ["Otieno", "94%", "2.1 km", "★ 4.8"],
                ["Wanjiku", "89%", "4.7 km", "★ 4.6"],
                ["Kamau", "85%", "6.0 km", "★ 4.9"],
              ].map(([n, m, d, r], i) => (
                <div
                  key={n}
                  className="mb-2 flex items-center justify-between rounded-xl border border-line bg-paper/60 px-4 py-3"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="font-medium">{n}</span>
                  <span className="flex items-center gap-4 text-sm text-muted">
                    <span>{d}</span>
                    <span className="text-gold">{r}</span>
                    <span className="rounded-full bg-acacia px-2.5 py-0.5 text-xs font-bold text-white">
                      {m}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* trades */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {TRADES.map((t) => (
            <span key={t} className="chip text-muted">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="mb-8 font-display text-3xl font-bold">How it works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["1", "Describe the job", "Type what you need in everyday language. The model figures out the trade."],
            ["2", "Get ranked matches", "We score nearby workers on skill, distance, ratings and job history."],
            ["3", "Hire & rate", "Contact your pick on WhatsApp, then rate them to help the next client."],
          ].map(([n, h, p]) => (
            <div key={n} className="card p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-clay font-display font-bold text-white">
                {n}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold">{h}</h3>
              <p className="mt-2 text-muted">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted">
        <div className="h-px bg-line" />
        <p className="pt-6">Kazi Connect — a capstone prototype. Built for Nairobi, with care.</p>
      </footer>
    </div>
  );
}
