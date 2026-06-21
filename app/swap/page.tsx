"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { useWallet } from "@/hooks/useWallet";
import { useQuotes } from "@/hooks/useQuotes";
import { AppShell, AppHeader, CtaButton } from "@/components/AppShell";
import { SwapInputCard } from "@/components/swap/SwapInputCard";
import { SwapOutputCard } from "@/components/swap/SwapOutputCard";
import { RoutesList } from "@/components/swap/RoutesList";

export default function SwapPage() {
  const router = useRouter();
  const { usdtBalance, isLoading: walletLoading } = useWallet();

  const [amountIn, setAmountIn] = useState<bigint>(0n);
  const [inputDisplay, setInputDisplay] = useState("");
  const lastUpdatedRef = useRef<number | null>(null);

  const { data: quotes, isFetching } = useQuotes(amountIn);

  if (quotes && !isFetching) lastUpdatedRef.current = Date.now();

  const bestQuote = quotes?.best ?? null;
  const canSwap = amountIn > 0n && bestQuote?.isAvailable === true && !isFetching;

  const handleSwap = () => {
    if (!bestQuote) return;
    const params = new URLSearchParams({
      amountIn: amountIn.toString(),
      routeType: bestQuote.routeType,
      amountOut: bestQuote.amountOutNet.toString(),
      feeApp: bestQuote.feeApp.toString(),
      savings: (bestQuote.savingsVsBaseline ?? 0n).toString(),
    });
    router.push(`/confirm?${params.toString()}`);
  };

  return (
    <AppShell>
      <AppHeader
        title="FXCOP"
        right={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        }
      />

      <SwapInputCard
        value={inputDisplay}
        onChange={(raw, formatted) => {
          setAmountIn(raw);
          setInputDisplay(formatted);
        }}
        usdtBalance={walletLoading ? 0n : usdtBalance}
      />

      <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0", position: "relative", zIndex: 2 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "var(--surface-2)",
            border: "4px solid var(--surface)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-2)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </div>

      <SwapOutputCard quote={bestQuote} isLoading={amountIn > 0n && isFetching} />

      <RoutesList
        quotes={quotes}
        isLoading={amountIn > 0n && isFetching}
        lastUpdatedMs={lastUpdatedRef.current}
      />

      <CtaButton onClick={handleSwap} disabled={!canSwap}>
        {canSwap
          ? `Swap mejor ruta · ${bestQuote!.amountOutFormatted} COPm`
          : "Ingresá un monto para continuar"}
      </CtaButton>
    </AppShell>
  );
}
