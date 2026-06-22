"use client";

import { useState, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { Mento } from "@mento-protocol/mento-sdk";
import { MAINNET, getContracts, CELO_TESTNET_CHAIN_ID } from "../lib/contracts";
import { useRealChainId } from "./useRealChainId";
import type { SwapState } from "../lib/quotes/types";

const SLIPPAGE_PCT = 0.5;        // 0.5% slippage tolerance
const DEADLINE_MINUTES = 30;     // 30 min

type SwapResult = {
  txHash: `0x${string}`;
  approvalTxHash: `0x${string}` | null;
  amountOut: bigint;
};

type UseSwapReturn = {
  state: SwapState;
  txHash: `0x${string}` | null;
  approvalTxHash: `0x${string}` | null;
  error: string | null;
  amountOut: bigint | null;
  execute: (amountIn: bigint) => Promise<void>;
  reset: () => void;
};

/**
 * State machine for USDT → COPm swaps via Mento SDK directly.
 *
 * States: idle → building → approving → swapping → success | error
 *
 * MiniPay invariants enforced on every transaction:
 * - feeCurrency: USDT adapter (0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72)
 * - gasPrice: legacy only (never maxFeePerGas / maxPriorityFeePerGas)
 *
 * The Mento SDK resolves the multi-hop route on-chain (e.g. USDT→USDm→COPm),
 * discovers the correct factories, and returns ready-to-send tx params
 * (including the approval tx if needed).
 */
export function useSwap(): UseSwapReturn {
  const [state, setState] = useState<SwapState>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amountOut, setAmountOut] = useState<bigint | null>(null);

  const { address } = useAccount();
  const chainId = useRealChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const execute = useCallback(
    async (amountIn: bigint) => {
      if (!walletClient || !publicClient || !address) {
        setError("Wallet no conectada");
        setState("error");
        return;
      }

      try {
        setError(null);
        setState("building");

        if (chainId === undefined) {
          setError("Red no detectada. Reconectá tu wallet.");
          setState("error");
          return;
        }

        // ── 1. Build swap transaction via Mento SDK ──
        //    The SDK returns { approval, swap: { params, amountOutMin, ... } }.
        //    `swap.params` is the full tx object (to, data, value) ready to send.
        //    We inject feeCurrency + gasPrice below for MiniPay compliance.
        const mento = await Mento.create(chainId);
        const contracts = getContracts(chainId);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60);

        const { approval, swap } = await mento.swap.buildSwapTransaction(
          contracts.USDT,
          contracts.COPM,
          amountIn,
          address,
          address,
          { slippageTolerance: SLIPPAGE_PCT, deadline }
        );

        const gasPrice = await publicClient.getGasPrice();
        const feeCurrency = contracts.USDT_FEE_ADAPTER as `0x${string}`;

        // ── 2. Approval (only if SDK says it's needed) ──
        if (approval) {
          setState("approving");
          const approveTxHash = await walletClient.sendTransaction({
            ...approval,
            feeCurrency,
            gasPrice,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          setApprovalTxHash(approveTxHash);
          await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
        }

        // ── 3. Swap ──
        setState("swapping");
        const swapTxHash = await walletClient.sendTransaction({
          ...swap.params,
          feeCurrency,
          gasPrice,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        setTxHash(swapTxHash);
        await publicClient.waitForTransactionReceipt({ hash: swapTxHash });

        setAmountOut(swap.expectedAmountOut);
        setState("success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        console.error("[useSwap] failed:", err);
        setError(message);
        setState("error");
      }
    },
    [walletClient, publicClient, address, chainId]
  );

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setApprovalTxHash(null);
    setError(null);
    setAmountOut(null);
  }, []);

  return { state, txHash, approvalTxHash, error, amountOut, execute, reset };
}
