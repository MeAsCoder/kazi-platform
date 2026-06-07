"use client";

import { useState } from "react";

export function AvailabilityToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !on;
    const res = await fetch("/api/worker/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    if (res.ok) setOn(next);
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`mt-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${
        on ? "border-acacia bg-acacia-soft" : "border-line bg-paper/70"
      }`}
    >
      <span className="font-medium">{on ? "Available for work" : "Not available"}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-acacia" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
