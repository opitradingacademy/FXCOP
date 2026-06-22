"use client";

import { formatUnits, parseUnits } from "viem";

interface Props {
  value: string;
  onChange: (raw: bigint, formatted: string) => void;
  usdtBalance: bigint;
}

export function SwapInputCard({ value, onChange, usdtBalance }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    if (v === "" || v === ".") {
      onChange(0n, v);
      return;
    }
    try {
      const raw = parseUnits(v, 6);
      onChange(raw, v);
    } catch {
      // invalid amount — ignore
    }
  };

  const balanceFormatted = formatUnits(usdtBalance, 6);

  const setMax = () => {
    onChange(usdtBalance, balanceFormatted);
  };

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
            Envias
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={handleChange}
            placeholder="0.00"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 28,
              fontWeight: 600,
              color: "var(--text)",
              width: "100%",
              fontFamily: "var(--font-outfit), sans-serif",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>≈ ${value || "0.00"} USD</span>
            {usdtBalance > 0n && (
              <button
                onClick={setMax}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--primary)",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 6,
                  background: "rgba(16,185,129,0.1)",
                }}
              >
                MAX
              </button>
            )}
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
              background: "linear-gradient(135deg, #26a17b, #1e8772)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            T
          </span>
          USDT
        </div>
      </div>
    </div>
  );
}
