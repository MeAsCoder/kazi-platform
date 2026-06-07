"use client";

import { signOut } from "next-auth/react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-acacia font-display text-sm font-bold text-white">
        KC
      </span>
      <span
        className={`font-display text-lg font-bold tracking-tight ${
          light ? "text-white" : "text-ink"
        }`}
      >
        Kazi Connect
      </span>
    </span>
  );
}

export function Stars({ value, count }: { value: number; count: number }) {
  if (!count) return <span className="text-sm text-muted">No reviews yet</span>;
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-gold">{"★".repeat(full)}</span>
      <span className="text-line">{"★".repeat(5 - full)}</span>
      <span className="text-muted">
        {value.toFixed(1)} ({count})
      </span>
    </span>
  );
}

export function Badge({
  children,
  tone = "acacia",
}: {
  children: React.ReactNode;
  tone?: "acacia" | "clay" | "muted";
}) {
  const tones = {
    acacia: "bg-acacia-soft text-acacia-dark",
    clay: "bg-clay-soft text-clay",
    muted: "bg-line/60 text-muted",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ redirectTo: "/" })} className="btn-ghost text-sm">
      Sign out
    </button>
  );
}
