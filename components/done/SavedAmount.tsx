"use client";

interface Props {
  savings: bigint;
}

export function SavedAmount({ savings }: Props) {
  if (savings <= 0n) return null;

  const formatted = (Number(savings) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });

  return (
    <div
      style={{
        marginTop: 16,
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: 14,
        padding: "12px 14px",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <div style={{ fontSize: 12, color: "var(--text)" }}>
        Ahorraste{" "}
        <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 700, color: "var(--primary)" }}>
          +{formatted} COPm
        </span>{" "}
        vs Mento directo
      </div>
    </div>
  );
}
