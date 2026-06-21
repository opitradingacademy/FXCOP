"use client";

import type { SwapState } from "@/lib/quotes/types";

interface Props {
  state: SwapState;
  onConfirm: () => void;
  onCancel: () => void;
}

const STATE_LABEL: Partial<Record<SwapState, string>> = {
  idle: "Confirmar swap",
  approving: "Aprobando USDT...",
  approved: "Ejecutando swap...",
  swapping: "Ejecutando swap...",
  success: "¡Listo!",
  error: "Reintentar",
};

export function ConfirmButton({ state, onConfirm, onCancel }: Props) {
  const isPending = state === "approving" || state === "swapping" || state === "approved";
  const label = STATE_LABEL[state] ?? "Confirmar swap";

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={onConfirm}
        disabled={isPending || state === "success"}
        style={{
          width: "100%",
          background: isPending || state === "success" ? "var(--surface-2)" : "var(--primary)",
          color: isPending || state === "success" ? "var(--text-3)" : "white",
          border: "none",
          padding: 14,
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          cursor: isPending || state === "success" ? "not-allowed" : "pointer",
          fontFamily: "var(--font-outfit), sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background 0.2s",
          marginBottom: 10,
        }}
      >
        {isPending && (
          <span className="spin" style={{ display: "inline-block" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" strokeDasharray="28" strokeDashoffset="8" />
            </svg>
          </span>
        )}
        {label}
      </button>
      <button
        onClick={onCancel}
        disabled={isPending}
        style={{
          width: "100%",
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-2)",
          padding: 14,
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          fontFamily: "var(--font-outfit), sans-serif",
          transition: "background 0.2s",
        }}
      >
        Cancelar
      </button>
    </div>
  );
}
