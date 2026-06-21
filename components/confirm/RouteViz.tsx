"use client";

interface Props {
  routeType: "mento" | "ubeswap" | "best";
}

const ROUTE_PATHS: Record<string, { hops: string[]; label: string }> = {
  mento: {
    hops: ["USDT", "USDm", "COPm"],
    label: "via Mento V3 (FPMM Router)",
  },
  ubeswap: {
    hops: ["USDT", "COPm"],
    label: "via Ubeswap V3",
  },
  best: {
    hops: ["USDT", "USDm", "COPm"],
    label: "via Mento V3 (mejor precio)",
  },
};

const ArrowRight = () => (
  <svg width="20" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export function RouteViz({ routeType }: Props) {
  const path = ROUTE_PATHS[routeType] ?? ROUTE_PATHS.mento;

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 14,
        marginTop: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Ruta
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text)", flexWrap: "wrap" }}>
        {path.hops.map((hop, i) => (
          <span key={hop} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: "var(--bg)",
                padding: "4px 8px",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              {hop}
            </span>
            {i < path.hops.length - 1 && <ArrowRight />}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>{path.label}</div>
    </div>
  );
}
