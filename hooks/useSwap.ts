"use client";

import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { parseAbi, encodeFunctionData } from "viem";
import { MAINNET } from "../lib/contracts";
import { calcMinAmountOut } from "../lib/decimals";
import type { RouteQuote, SwapState } from "../lib/quotes/types";

const FXCOP_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_FXCOP_ROUTER as `0x${string}`;
const SLIPPAGE_PCT = 0.5; // 0.5% slippage tolerance
const DEADLINE_SECONDS = 1800; // 30 minutes

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
]);

const FXCOP_ROUTER_ABI = parseAbi([
  "function swap(address tokenIn, uint256 amountIn, address tokenOut, uint8 routeType, uint256 minAmountOut, uint256 deadline, bytes routeData) external returns (uint256 amountOut)",
]);

type SwapResult = {
  txHash: `0x${string}`;
  amountOut: bigint;
};

type UseSwapReturn = {
  state: SwapState;
  txHash: `0x${string}` | null;
  error: string | null;
  execute: (amountIn: bigint, quote: RouteQuote) => Promise<void>;
  reset: () => void;
};

/**
 * State machine for USDT → COPm swaps via FXCOPRouter.
 *
 * States: idle → approving → approved → swapping → success | error
 *
 * MiniPay invariants enforced:
 * - feeCurrency: USDT adapter (0x0e2a3e05...)
 * - gasPrice: legacy only (never maxFeePerGas / maxPriorityFeePerGas)
 */
export function useSwap(): UseSwapReturn {
  const [state, setState] = useState<SwapState>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const execute = useCallback(
    async (amountIn: bigint, quote: RouteQuote) => {
      if (!walletClient || !publicClient) {
        setError("Wallet no conectada");
        setState("error");
        return;
      }

      try {
        setError(null);

        // ── 1. Check and execute approve if needed ──
        const currentAllowance = await publicClient.readContract({
          address: MAINNET.USDT as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [walletClient.account.address, FXCOP_ROUTER_ADDRESS],
        });

        if (currentAllowance < amountIn) {
          setState("approving");

          const gasPrice = await publicClient.getGasPrice();

          const approveTxHash = await walletClient.writeContract({
            address: MAINNET.USDT as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [FXCOP_ROUTER_ADDRESS, amountIn],
            // MiniPay CIP-64 fields — not in standard wagmi types but required on Celo
            ...({ feeCurrency: MAINNET.USDT_FEE_ADAPTER, gasPrice } as object),
          } as Parameters<typeof walletClient.writeContract>[0]);

          await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
        }

        setState("approved");

        // ── 2. Execute swap ──
        setState("swapping");

        const gasPrice = await publicClient.getGasPrice();
        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);
        const routeType = quote.routeType === "ubeswap" ? 1 : 0;

        // minAmountOut is NET to user (post-fee) — the contract enforces this
        const minAmountOut = calcMinAmountOut(quote.amountOutNet, SLIPPAGE_PCT);

        // routeData encodes recipient = FXCOPRouter so COPm lands there for fee split
        const routeData = encodeRouteData({
          amountIn,
          minAmountOut,
          routeType,
          recipient: FXCOP_ROUTER_ADDRESS,
          deadline,
          poolFee: quote.poolFee,
        });

        const swapTxHash = await walletClient.writeContract({
          address: FXCOP_ROUTER_ADDRESS,
          abi: FXCOP_ROUTER_ABI,
          functionName: "swap",
          args: [
            MAINNET.USDT as `0x${string}`,
            amountIn,
            MAINNET.COPM as `0x${string}`,
            routeType,
            minAmountOut,
            deadline,
            routeData,
          ],
          // MiniPay CIP-64 fields
          ...({ feeCurrency: MAINNET.USDT_FEE_ADAPTER, gasPrice } as object),
        } as Parameters<typeof walletClient.writeContract>[0]);

        setTxHash(swapTxHash);
        await publicClient.waitForTransactionReceipt({ hash: swapTxHash });

        setState("success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        setState("error");
      }
    },
    [walletClient, publicClient]
  );

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  return { state, txHash, error, execute, reset };
}

// ── Mento Router V3 ABI (swapExactTokensForTokens with tuple routes) ──────────
const MENTO_ROUTER_ABI = parseAbi([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (address from, address to, address factory)[] routes, address to, uint256 deadline) external returns (uint256[] amounts)",
]);

// ── Ubeswap V3 SwapRouter ABI (standard Uniswap V3 ISwapRouter interface) ────
// Note: MAINNET.UBESWAP_ROUTER (0x3C255DED9B25f0BFB4EF1D14234BD2514d7A7A0d) is
// labeled "Univ Router" in CLAUDE.md but FXCOPRouter's approve→call pattern is
// compatible with SwapRouter02.exactInputSingle — it pulls tokens from the approver
// (FXCOPRouter). If the deployed address uses execute() instead, update this ABI.
const UBESWAP_SWAPROUTER_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut)",
]);

type EncodeRouteDataParams = {
  amountIn: bigint;
  minAmountOut: bigint;
  routeType: number;
  recipient: `0x${string}`;
  deadline: bigint;
  poolFee?: number;
};

/**
 * Build the ABI-encoded calldata that FXCOPRouter forwards to the underlying router.
 * Recipient MUST be FXCOPRouter so COPm lands there for the fee split.
 *
 * Mento (routeType=0): swapExactTokensForTokens — 2-hop USDT→USDm→COPm via BiPoolManager
 * Ubeswap (routeType=1): exactInputSingle — direct USDT→COPm on the discovered fee-tier pool
 */
function encodeRouteData({
  amountIn,
  minAmountOut,
  routeType,
  recipient,
  deadline,
  poolFee,
}: EncodeRouteDataParams): `0x${string}` {
  if (routeType === 0) {
    // Mento 2-hop: USDT → USDm → COPm
    // All Mento FPMM pools are registered in BiPoolManager (the factory).
    return encodeFunctionData({
      abi: MENTO_ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [
        amountIn,
        minAmountOut,
        [
          {
            from: MAINNET.USDT as `0x${string}`,
            to: MAINNET.USDM as `0x${string}`,
            factory: MAINNET.MENTO_BIPOOLMANAGER as `0x${string}`,
          },
          {
            from: MAINNET.USDM as `0x${string}`,
            to: MAINNET.COPM as `0x${string}`,
            factory: MAINNET.MENTO_BIPOOLMANAGER as `0x${string}`,
          },
        ],
        recipient,
        deadline,
      ],
    });
  }

  // Ubeswap V3 single-hop: USDT → COPm directly
  // poolFee comes from ubeswapQuoter (500, 3000, or 10000 bps)
  if (!poolFee) throw new Error("poolFee is required for Ubeswap route");

  return encodeFunctionData({
    abi: UBESWAP_SWAPROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: MAINNET.USDT as `0x${string}`,
        tokenOut: MAINNET.COPM as `0x${string}`,
        fee: poolFee,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}
