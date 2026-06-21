/**
 * hooks/useWallet.ts
 * Wagmi hook for MiniPay auto-connect.
 *
 * MiniPay constraints:
 * - Auto-connect when window.ethereum.isMiniPay === true
 * - feeCurrency MUST always be MAINNET.USDT_FEE_ADAPTER
 * - Legacy transactions only (no maxFeePerGas/maxPriorityFeePerGas)
 * - Balance fetch with 5s timeout and fallback to 0n
 */

"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { MAINNET } from "@/lib/contracts";

// Minimal ERC-20 balanceOf ABI
const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Fee currency to use on EVERY transaction — never change this.
export const FEE_CURRENCY = MAINNET.USDT_FEE_ADAPTER as `0x${string}`;

export interface WalletState {
  /** Connected wallet address, or undefined if not connected */
  address: `0x${string}` | undefined;
  /** True when running inside MiniPay */
  isMiniPay: boolean;
  /** Raw USDT balance (6 decimals). 0n on load or error. */
  usdtBalance: bigint;
  /** True after the injected connector resolves */
  isConnected: boolean;
  /** True while auto-connect or balance fetch is in progress */
  isLoading: boolean;
}

/**
 * Detects MiniPay environment and auto-connects.
 * Returns wallet state for use across the app.
 */
export function useWallet(): WalletState {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<bigint>(0n);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();

  // ── Detect MiniPay and auto-connect ──
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    const detected = Boolean(ethereum?.isMiniPay);
    setIsMiniPay(detected);

    if (detected && !isConnected) {
      connect({ connector: injected() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch USDT balance with 5s timeout ──
  const { data: rawBalance, isLoading: isBalanceQuerying } = useReadContract(
    address
      ? {
          address: MAINNET.USDT as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address],
        }
      : undefined
  );

  // Apply 5-second timeout: if still loading after 5s, fall back to 0n
  useEffect(() => {
    if (!address) {
      setUsdtBalance(0n);
      return;
    }

    if (!isBalanceQuerying && rawBalance !== undefined) {
      setUsdtBalance(rawBalance as bigint);
      return;
    }

    // Start timeout guard
    setBalanceLoading(true);
    const timer = setTimeout(() => {
      // If still no balance after 5s, stay at 0n (fallback)
      setBalanceLoading(false);
    }, 5_000);

    return () => clearTimeout(timer);
  }, [address, rawBalance, isBalanceQuerying]);

  // Resolve balance from contract read when it lands
  useEffect(() => {
    if (rawBalance !== undefined) {
      setUsdtBalance(rawBalance as bigint);
      setBalanceLoading(false);
    }
  }, [rawBalance]);

  return {
    address,
    isMiniPay,
    usdtBalance,
    isConnected,
    isLoading: isConnecting || balanceLoading,
  };
}
