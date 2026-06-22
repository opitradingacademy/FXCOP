"use client";

import { useEffect, useState } from "react";
import { useChainId } from "wagmi";

/**
 * The source of truth for the connected chain is the wallet itself,
 * not wagmi's internal state (which can be stale on mount).
 *
 * This hook reads window.ethereum.chainId directly, with wagmi as a
 * initial fallback while window.ethereum is hydrating.
 */
export function useRealChainId(): number | undefined {
  const wagmiChainId = useChainId();
  const [chainId, setChainId] = useState<number | undefined>(wagmiChainId);

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setChainId(wagmiChainId);
      return;
    }

    const readChainId = () => {
      const raw = ethereum.chainId;
      if (typeof raw === "string" && raw.startsWith("0x")) {
        setChainId(parseInt(raw, 16));
      } else if (typeof raw === "number") {
        setChainId(raw);
      } else if (typeof raw === "string") {
        setChainId(parseInt(raw, 10));
      }
    };

    // Read once on mount in case wagmi's value is stale.
    readChainId();

    // Listen for changes and update immediately.
    const handleChange = () => readChainId();
    ethereum.on?.("chainChanged", handleChange);

    return () => {
      ethereum.removeListener?.("chainChanged", handleChange);
    };
  }, [wagmiChainId]);

  return chainId;
}
