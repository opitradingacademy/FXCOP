"use client";

interface Props {
  txHash: `0x${string}`;
  amountOut: bigint;
  savings: bigint;
  durationMs?: number;
}

export function TxReceipt({ txHash, amountOut, savings, durationMs }: Props) {
  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
  const amountFormatted = (Number(amountOut) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });
  const savingsFormatted =
    savings > 0n
      ? `+${(Number(savings) / 1e18).toLocaleString("es-CO", { maximumFractionDigits: 0 })} COPm`
      : null;
  const durationSec = durationMs != null ? (durationMs / 1000).toFixed(1) : null;

  const celoscanUrl = `https://celoscan.io/tx/${txHash}`;

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 14,
        width: "100%",
        marginTop: 24,
      }}
    >
      <Row label="Recibiste" value={`${amountFormatted} COPm`} highlight />
      <Row
        label="Tx hash"
        value={
          <a
            href={celoscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--primary)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11,
              textDecoration: "none",
            }}
          >
            {shortHash} ↗
          </a>
        }
      />
      {durationSec && <Row label="Tiempo" value={`${durationSec} segundos`} />}
      {savingsFormatted && <Row label="Ahorraste" value={savingsFormatted} highlight />}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 13, color: highlight ? "var(--primary)" : "var(--text)", fontWeight: highlight ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}
