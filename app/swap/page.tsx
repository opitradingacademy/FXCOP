"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useChainId, useConnect } from "wagmi";
import { metaMask, injected } from "wagmi/connectors";
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
  const { connect, isPending: isConnecting } = useConnect();
  const { usdtBalance, isLoading: walletLoading } = useWallet();

  const [inputDisplay, setInputDisplay] = useState("");
  const [amountIn, setAmountIn] = useState<bigint>(0n);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const { data: quote, isFetching, error: quoteError } = useQuotes(amountIn, chainId);
  const { state, error: swapError, execute, reset } = useSwap();

  const isTestnet = chainId === CELO_TESTNET_CHAIN_ID;
  const isMainnet = chainId === 42220;

  const handleSwitchToTestnet = async () => {
    setSwitchError(null);
    const eth = (window as any).ethereum;
    if (!eth?.request) {
      setSwitchError("Tu wallet no expone la API estándar. Cambiá de red manualmente.");
      return;
    }

    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa044c" }], // 11142220 in hex (Celo Sepolia)
      });
      // If we got here, the wallet accepted. wagmi will update chainId via event.
    } catch (err: any) {
      console.error("[FXCOP] wallet_switchEthereumChain threw:", err);
      const code = err?.code;
      const msg = err?.message || "Error desconocido";

      if (code === 4902) {
        // Chain not added. Try to add it.
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa044c",
                chainName: "Celo Sepolia",
                nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
                rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
                blockExplorerUrls: ["https://celo-sepolia.blockscout.com"],
              },
            ],
          });
        } catch (addErr: any) {
          console.error("[FXCOP] wallet_addEthereumChain threw:", addErr);
          setSwitchError(`MiniPay no soporta agregar Celo Sepolia. Cód: ${addErr?.code ?? "?"}`);
        }
      } else if (code === 4001) {
        setSwitchError("Rechazaste el cambio de red en MiniPay.");
      } else if (code === 4200) {
        setSwitchError("MiniPay no permite cambiar de red desde la app. Hacélo manualmente.");
      } else {
        setSwitchError(`MiniPay no soporta cambio de red. Cód: ${code} · ${msg.slice(0, 80)}`);
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

  const handleCta = () => {
    if (!isConnected) {
      // Prefer MetaMask connector (avoids Trust Wallet grabbing the call first).
      // Fallback to injected if MetaMask isn't installed.
      const isMetaMask = (window as any)?.ethereum?.isMetaMask;
      connect({ connector: isMetaMask ? metaMask() : injected() });
      return;
    }
    handleSwap();
  };

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
        <div style={{ marginBottom: 12 }}>
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
              textAlign: "center",
              width: "100%",
              cursor: "pointer",
              fontFamily: "var(--font-outfit), sans-serif",
            }}
          >
            ⚠ Mainnet (chainId {chainId}) · Toca para cambiar a Celo Sepolia
          </button>
          {switchError && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-2)",
                marginTop: 6,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {switchError}
              <br />
              <span style={{ color: "var(--text-3)" }}>
                Si no podés cambiar desde acá, abrí MiniPay → Ajustes → Redes → agregá Celo Sepolia manualmente.
              </span>
            </div>
          )}
        </div>
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
        onClick={handleCta}
        disabled={isConnected && !canSwap}
      >
        {isConnecting
          ? "Conectando..."
          : !isConnected
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
