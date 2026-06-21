"use client";

import type { RouteQuote } from "@/lib/quotes/types";

interface Props {
  amountIn: bigint;
  quote: RouteQuote;
  gasPrice: bigint;
}

function row(label: string, value: string, highlight = false) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: highlight ? "var(--primary)" : "var(--text)", fontWeight: highlight ? 600 : 500 }}>
        {value}
      </span>
    </div>
  );
}

export function TxBreakdown({ amountIn, quote, gasPrice }: Props) {
  const amountInFormatted = (Number(amountIn) / 1e6).toFixed(2);
  const feeAppCOP = (Number(quote.feeApp) / 1e18).toFixed(2);
  const feeAppUSD = (Number(quote.feeApp) / 1e18 / 4200).toFixed(4);
  const savings = quote.savingsVsBaseline ?? 0n;
  const savingsFormatted =
    savings > 0n
      ? `+${(Number(savings) / 1e18).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COPm`
      : "—";

  const gasCostUSD = (Number(gasPrice) * Number(quote.gasEstimate) * 1e-18).toFixed(4);

  const amountOutNet = (Number(quote.amountOutNet) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });

  const trmEfectivo =
    quote.amountOutNet > 0n
      ? ((Number(quote.amountOutNet) / 1e18) / (Number(amountIn) / 1e6)).toLocaleString("es-CO", {
          maximumFractionDigits: 1,
        })
      : "—";

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      {row("Enviás", `${amountInFormatted} USDT`)}
      {row("Recibís", `${amountOutNet} COPm`, true)}
      <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
      {row("Network fee", `~$${gasCostUSD} USD`)}
      {row("Fee FXCOP (0.05%)", `${feeAppCOP} COPm (~$${feeAppUSD})`)}
      <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
      {row("TRM efectivo", `$1 USD = ${trmEfectivo} COP`)}
      {savings > 0n && row("Ahorro vs Mento", savingsFormatted, true)}
    </div>
  );
}
