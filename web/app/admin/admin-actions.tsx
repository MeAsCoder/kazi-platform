"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function resolve(status: "RESOLVED" | "DISMISSED") {
    setBusy(true);
    await fetch(`/api/admin/flags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <button className="btn-ghost py-1 text-sm" disabled={busy} onClick={() => resolve("DISMISSED")}>
        Dismiss
      </button>
      <button className="btn-primary py-1 text-sm" disabled={busy} onClick={() => resolve("RESOLVED")}>
        Resolve
      </button>
    </div>
  );
}

export function BanButton({ id, banned }: { id: string; banned: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBanned: !banned }),
    });
    router.refresh();
  }
  return (
    <button
      className={`text-sm font-medium ${banned ? "text-acacia" : "text-clay"} hover:underline`}
      disabled={busy}
      onClick={toggle}
    >
      {banned ? "Unban" : "Ban"}
    </button>
  );
}

export function ScanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function scan() {
    setBusy(true);
    await fetch("/api/admin/scan", { method: "POST" });
    router.refresh();
    setBusy(false);
  }
  return (
    <button className="btn-ghost text-sm" disabled={busy} onClick={scan}>
      {busy ? "Scanning…" : "Run fraud scan"}
    </button>
  );
}
