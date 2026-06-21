"use client";

import type { AggregatedQuotes } from "@/lib/quotes/aggregator";
import { RouteCard } from "./RouteCard";

interface Props {
  quotes: AggregatedQuotes | undefined;
  isLoading: boolean;
  lastUpdatedMs: number | null;
}

export function RoutesList({ quotes, isLoading, lastUpdatedMs }: Props) {
  const secondsAgo =
    lastUpdatedMs != null ? Math.round((Date.now() - lastUpdatedMs) / 1000) : null;

  const availableCount = quotes
    ? [quotes.mento, quotes.ubeswap].filter((q) => q.isAvailable).length
    : 0;

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "var(--text-3)",
          fontWeight: 500,
          padding: "0 4px",
          marginBottom: 10,
        }}
      >
        <span>
          <span className="live-dot" style={{ marginRight: 6 }} />
          {isLoading
            ? "Buscando rutas..."
            : availableCount > 0
            ? `${availableCount} ruta${availableCount > 1 ? "s" : ""} encontrada${availableCount > 1 ? "s" : ""}`
            : "Sin rutas disponibles"}
        </span>
        {secondsAgo != null && !isLoading && (
          <span style={{ color: "var(--primary)", display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {secondsAgo}s atrás
          </span>
        )}
      </div>

      {isLoading && !quotes && (
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 20,
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 13,
          }}
        >
          <div className="spin" style={{ display: "inline-block", marginBottom: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" strokeDasharray="28" strokeDashoffset="8" />
            </svg>
          </div>
          <div>Consultando rutas...</div>
        </div>
      )}

      {quotes && (
        <>
          {quotes.best.isAvailable && (
            <RouteCard quote={quotes.best} isBest />
          )}
          {quotes.ubeswap.isAvailable && quotes.best.routeType !== "ubeswap" && (
            <RouteCard quote={quotes.ubeswap} />
          )}
          {quotes.mento.isAvailable && (
            <RouteCard quote={quotes.mento} />
          )}
        </>
      )}
    </div>
  );
}
