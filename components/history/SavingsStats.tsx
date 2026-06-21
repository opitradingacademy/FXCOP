"use client";

interface Props {
  totalSavings: bigint;
  swapCount: number;
}

export function SavingsStats({ totalSavings, swapCount }: Props) {
  const savingsFormatted = (Number(totalSavings) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>Total ahorrado</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--primary)",
            marginTop: 4,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          +{savingsFormatted}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>COPm este mes</div>
      </div>
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>Swaps realizados</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            marginTop: 4,
            fontFamily: "var(--font-mono), monospace",
          }}
        >
          {swapCount}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>últimos 30 días</div>
      </div>
    </div>
  );
}
