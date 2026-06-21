"use client";

export interface TxRecord {
  txHash: `0x${string}`;
  amountOut: bigint;
  savings: bigint;
  timestamp: number;
}

interface Props {
  tx: TxRecord;
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffH = diffMs / 3_600_000;
  if (diffH < 1) return "Hace menos de 1h";
  if (diffH < 24) return `Hace ${Math.floor(diffH)}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Ayer";
  return `Hace ${diffD} días`;
}

export function TransactionItem({ tx }: Props) {
  const amountFormatted = (Number(tx.amountOut) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });
  const savingsFormatted =
    tx.savings > 0n
      ? `+${(Number(tx.savings) / 1e18).toLocaleString("es-CO", { maximumFractionDigits: 0 })} ahorro`
      : "estándar";
  const hasSavings = tx.savings > 0n;
  const timeLabel = formatRelativeTime(tx.timestamp);

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>USDT → COPm</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{timeLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: "var(--font-mono), monospace",
            }}
          >
            +{amountFormatted}
          </div>
          <div
            style={{
              fontSize: 10,
              color: hasSavings ? "var(--primary)" : "var(--text-3)",
              fontWeight: hasSavings ? 600 : 400,
            }}
          >
            {savingsFormatted}
          </div>
        </div>
      </div>
    </div>
  );
}
