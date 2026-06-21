"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell, AppHeader, CtaButton } from "@/components/AppShell";
import { SuccessIcon } from "@/components/done/SuccessIcon";
import { TxReceipt } from "@/components/done/TxReceipt";
import { SavedAmount } from "@/components/done/SavedAmount";

function DoneContent() {
  const router = useRouter();
  const params = useSearchParams();

  const txHash = (params.get("txHash") ?? "0x") as `0x${string}`;
  const amountOut = BigInt(params.get("amountOut") ?? "0");
  const savings = BigInt(params.get("savings") ?? "0");

  const amountFormatted = (Number(amountOut) / 1e18).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  });

  return (
    <AppShell>
      <AppHeader title="¡Swap exitoso!" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "40px 4px",
        }}
      >
        <SuccessIcon />

        <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          ¡Swap exitoso!
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", marginTop: 8, fontFamily: "var(--font-mono), monospace" }}>
          {amountFormatted}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>COPm en tu wallet</div>

        <TxReceipt txHash={txHash} amountOut={amountOut} savings={savings} />
        <SavedAmount savings={savings} />
      </div>

      <CtaButton onClick={() => router.push("/history")}>
        Ver mi historial
      </CtaButton>
      <CtaButton onClick={() => router.push("/swap")} secondary>
        Hacer otro swap
      </CtaButton>
    </AppShell>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "var(--text-3)" }}>Cargando...</div>}>
      <DoneContent />
    </Suspense>
  );
}
