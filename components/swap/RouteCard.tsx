"use client";

import type { RouteQuote } from "@/lib/quotes/types";

interface Props {
  quote: RouteQuote;
  isBest?: boolean;
}

const ROUTE_META: Record<
  "mento" | "ubeswap" | "best",
  { label: string; subtitle: string; icon: string; color: string }
> = {
  mento: {
    label: "Mento",
    subtitle: "Precio oráculo",
    icon: "M",
    color: "linear-gradient(135deg, #6366f1, #4f46e5)",
  },
  ubeswap: {
    label: "Ubeswap",
    subtitle: "AMM directo",
    icon: "U",
    color: "linear-gradient(135deg, #fc6e22, #e54e07)",
  },
  best: {
    label: "Mejor ruta",
    subtitle: "Seleccionada",
    icon: "⚡",
    color: "linear-gradient(135deg, #10b981, #34d399)",
  },
};

export function RouteCard({ quote, isBest = false }: Props) {
  if (!quote.isAvailable) return null;

  const meta = ROUTE_META[quote.routeType];
  const amountFormatted = (Number(quote.amountOutNet) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });

  const savings = quote.savingsVsBaseline ?? 0n;
  const hasSavings = savings > 0n;
  const savingsFormatted = hasSavings
    ? `+${(Number(savings) / 1e18).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COPm`
    : "estándar";

  const gasCost = (Number(quote.gasEstimate) * 5e-10).toFixed(3);

  return (
    <div
      style={{
        background: isBest
          ? "linear-gradient(180deg, rgba(16,185,129,0.08), transparent)"
          : "var(--surface-2)",
        border: isBest ? "1px solid var(--primary)" : "1px solid var(--border)",
        boxShadow: isBest ? "0 0 0 1px var(--primary)" : "none",
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        cursor: "pointer",
        position: "relative",
        transition: "border-color 0.15s",
      }}
    >
      {isBest && (
        <span
          style={{
            position: "absolute",
            top: -8,
            right: 12,
            background: "var(--primary)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            letterSpacing: "0.04em",
          }}
        >
          MEJOR RUTA
        </span>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: meta.color,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "white",
            }}
          >
            {meta.icon}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{meta.label}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{meta.subtitle}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {amountFormatted}
          </div>
          <div
            style={{
              fontSize: 10,
              color: hasSavings ? "var(--primary)" : "var(--text-3)",
              marginTop: 2,
              fontWeight: hasSavings ? 600 : 400,
            }}
          >
            {savingsFormatted}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          fontSize: 10,
          color: "var(--text-3)",
          paddingTop: 8,
          borderTop: "1px solid var(--border)",
        }}
      >
        <span>⛽ ~${gasCost}</span>
        <span>⏱ ~5 seg</span>
        <span>📊 0.05% fee FXCOP</span>
      </div>
    </div>
  );
}
