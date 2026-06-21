"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePublicClient } from "wagmi";
import { AppShell, AppHeader } from "@/components/AppShell";
import { TxBreakdown } from "@/components/confirm/TxBreakdown";
import { RouteViz } from "@/components/confirm/RouteViz";
import { ConfirmButton } from "@/components/confirm/ConfirmButton";
import { useSwap } from "@/hooks/useSwap";
import { saveToHistory } from "@/lib/history";
import type { RouteQuote } from "@/lib/quotes/types";
import { useEffect } from "react";

function ConfirmContent() {
  const router = useRouter();
  const params = useSearchParams();

  const amountIn = BigInt(params.get("amountIn") ?? "0");
  const routeType = (params.get("routeType") ?? "mento") as "mento" | "ubeswap" | "best";
  const amountOutNet = BigInt(params.get("amountOut") ?? "0");
  const feeApp = BigInt(params.get("feeApp") ?? "0");
  const savings = BigInt(params.get("savings") ?? "0");

  const quote: RouteQuote = {
    routeType,
    amountOut: amountOutNet + feeApp,
    amountOutNet,
    amountOutFormatted: (Number(amountOutNet) / 1e18).toLocaleString("es-CO", { maximumFractionDigits: 0 }),
    feeApp,
    gasEstimate: 300_000n,
    savingsVsBaseline: savings,
    isAvailable: true,
  };

  const publicClient = usePublicClient();
  const { state, txHash, execute, reset } = useSwap();

  useEffect(() => {
    if (state === "success" && txHash) {
      saveToHistory({ txHash, amountOut: amountOutNet, savings, timestamp: Date.now() });
      const doneParams = new URLSearchParams({
        txHash,
        amountOut: amountOutNet.toString(),
        savings: savings.toString(),
      });
      router.push(`/done?${doneParams.toString()}`);
    }
  }, [state, txHash]);

  const handleConfirm = () => {
    execute(amountIn, quote);
  };

  const handleCancel = () => {
    reset();
    router.push("/swap");
  };

  const gasPrice = 5_000_000_000n; // 5 gwei fallback

  const amountFormatted = (Number(amountOutNet) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });

  return (
    <AppShell>
      <AppHeader title="Confirmar swap" />

      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
          <TokenBadge letter="T" gradient="linear-gradient(135deg,#26a17b,#1e8772)" label="USDT" />
          <svg width="32" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <TokenBadge letter="$" gradient="linear-gradient(135deg,#fcd34d,#f59e0b)" label="COPm" />
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>Vas a recibir</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", marginTop: 4, fontFamily: "var(--font-mono), monospace" }}>
          {amountFormatted}
        </div>
        <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 4 }}>COPm en tu wallet</div>
      </div>

      <TxBreakdown amountIn={amountIn} quote={quote} gasPrice={gasPrice} />
      <RouteViz routeType={routeType} />
      <ConfirmButton state={state} onConfirm={handleConfirm} onCancel={handleCancel} />
    </AppShell>
  );
}

function TokenBadge({ letter, gradient, label }: { letter: string; gradient: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 18 }}>
        {letter}
      </div>
      <span style={{ marginTop: 6, fontSize: 11, color: "var(--text-2)" }}>{label}</span>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--text-3)" }}>Cargando...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
