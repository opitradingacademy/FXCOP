"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId } from "wagmi";
import { parseUnits } from "viem";
import { useWallet } from "@/hooks/useWallet";
import { useQuotes } from "@/hooks/useQuotes";
import { useSwap } from "@/hooks/useSwap";
import { AppShell, AppHeader, CtaButton } from "@/components/AppShell";
import { SwapInputCard } from "@/components/swap/SwapInputCard";
import {
  CELO_TESTNET_CHAIN_ID,
} from "@/lib/contracts";

export default function SwapPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { usdtBalance, isLoading: walletLoading } = useWallet();

  const [inputDisplay, setInputDisplay] = useState("");
  const [amountIn, setAmountIn] = useState<bigint>(0n);

  const { data: quote, isFetching, error: quoteError } = useQuotes(amountIn, chainId);
  const { state, error: swapError, execute, reset } = useSwap();

  const isTestnet = chainId === CELO_TESTNET_CHAIN_ID;
  const isMainnet = chainId === 42220;

  const handleSwitchToTestnet = async () => {
    try {
      // Celo Sepolia chain params (EIP-3085 / EIP-3326)
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa044c" }], // 11155111 in hex
      });
    } catch (err: any) {
      // 4902 = chain not added to wallet. Add it then retry.
      if (err?.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa044c",
                chainName: "Celo Sepolia (Alfajores Testnet)",
                nativeCurrency: { name: "CELO", symbol: "A-CELO", decimals: 18 },
                rpcUrls: ["https://alfajores-forno.celo-testnet.org"],
                blockExplorerUrls: ["https://alfajores.celoscan.io"],
              },
            ],
          });
        } catch {
          // Wallet refused or doesn't support adding chains. User must do it manually.
          console.error("[FXCOP] wallet_addEthereumChain failed");
        }
      } else {
        // 4001 = user rejected. Other errors = wallet doesn't support switch.
        console.error("[FXCOP] wallet_switchEthereumChain failed:", err);
      }
    }
  };

  // HARD GUARD: this build only allows swaps on testnet.
  // The router contract doesn't exist anymore and the mainnet Mento pools
  // don't have a USDT→USDm route — mainnet swaps would fail AND burn gas.
  const canSwap =
    isConnected &&
    isTestnet &&
    amountIn > 0n &&
    quote?.isAvailable === true &&
    !isFetching &&
    state === "idle";

  const handleSwap = async () => {
    if (!quote?.isAvailable) return;
    if (!isTestnet) {
      console.error("[FXCOP] swap blocked: not on testnet", chainId);
      return;
    }
    await execute(amountIn);
  };

  // Navigate to /done on success
  if (state === "success" && quote) {
    const params = new URLSearchParams({
      amountOut: quote.amountOut.toString(),
    });
    router.push(`/done?${params.toString()}`);
    reset();
  }

  return (
    <AppShell>
      <AppHeader title="FXCOP" />

      {isTestnet ? (
        <div
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            padding: "8px 12px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Red de prueba · Alfajores (chainId {chainId})
        </div>
      ) : isConnected ? (
        <button
          onClick={handleSwitchToTestnet}
          style={{
            background: "rgba(244,63,94,0.1)",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12,
            textAlign: "center",
            width: "100%",
            cursor: "pointer",
            fontFamily: "var(--font-outfit), sans-serif",
          }}
        >
          ⚠ Mainnet (chainId {chainId}) · Toca para cambiar a Alfajores
        </button>
      ) : null}

      <SwapInputCard
        value={inputDisplay}
        onChange={(raw, formatted) => {
          setAmountIn(raw);
          setInputDisplay(formatted);
        }}
        usdtBalance={walletLoading ? 0n : usdtBalance}
      />

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
              Recibes
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color:
                  !quote || isFetching
                    ? "var(--text-3)"
                    : quote.isAvailable
                    ? "var(--text)"
                    : "var(--danger)",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              {amountIn === 0n
                ? "—"
                : isFetching
                ? "..."
                : quote?.isAvailable
                ? quote.amountOutFormatted
                : "Sin ruta disponible"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              {amountIn > 0n && quote?.isAvailable
                ? `≈ ${quote.amountOutFormatted} pesos colombianos`
                : "Cotización en tiempo real vía Mento"}
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
                background: "linear-gradient(135deg, #fcd34d, #f59e0b)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              $
            </span>
            COPm
          </div>
        </div>
      </div>

      {quoteError && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8, textAlign: "center" }}>
          No pudimos obtener la cotización. Probá de nuevo en unos segundos.
        </div>
      )}

      {swapError && state === "error" && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 8, textAlign: "center" }}>
          {swapError}
        </div>
      )}

      <CtaButton
        onClick={handleSwap}
        disabled={!canSwap}
      >
        {!isConnected
          ? "Conecta tu wallet"
          : !isTestnet
          ? "Cambia a Alfajores para probar"
          : amountIn === 0n
          ? "Ingresa un monto"
          : isFetching
          ? "Cotizando..."
          : state === "building"
          ? "Preparando..."
          : state === "approving"
          ? "Aprobando USDT..."
          : state === "swapping"
          ? "Comprando COPm..."
          : quote?.isAvailable
          ? `Comprar COPm`
          : "Sin ruta disponible"}
      </CtaButton>
    </AppShell>
  );
}
