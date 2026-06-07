"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastCtx = createContext<{ notify: (kind: ToastKind, message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastKind, string> = { success: "✓", error: "✕", info: "i" };
const TONES: Record<ToastKind, string> = {
  success: "border-acacia/30 bg-acacia-soft text-acacia-dark",
  error: "border-clay/30 bg-clay-soft text-clay",
  info: "border-line bg-card text-ink",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-card ${TONES[t.kind]}`}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/70 text-sm font-bold">
              {ICONS[t.kind]}
            </span>
            <span className="text-sm">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}