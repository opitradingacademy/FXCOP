"use client";

import type { RouteQuote } from "@/lib/quotes/types";

interface Props {
  quote: RouteQuote | null;
  isLoading: boolean;
}

export function SwapOutputCard({ quote, isLoading }: Props) {
  const displayValue = isLoading
    ? "..."
    : quote?.amountOutFormatted ?? "—";

  const savings = quote?.savingsVsBaseline ?? 0n;
  const hasSavings = savings > 0n;
  const savingsFormatted = hasSavings
    ? (Number(savings) / 1e18).toLocaleString("es-CO", { maximumFractionDigits: 0 })
    : null;

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, marginBottom: 8 }}>
            Recibís (mejor ruta)
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: isLoading ? "var(--text-3)" : "var(--text)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            {displayValue}
          </div>
          <div
            style={{
              fontSize: 12,
              marginTop: 6,
              color: hasSavings ? "var(--primary)" : "var(--text-3)",
              fontWeight: hasSavings ? 600 : 400,
            }}
          >
            {hasSavings ? `↑ +${savingsFormatted} COPm vs Mento directo` : "Calculando..."}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--bg)",
            padding: "6px 10px 6px 6px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fcd34d, #f59e0b)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            $
          </span>
          COPm
        </div>
      </div>
    </div>
  );
}
