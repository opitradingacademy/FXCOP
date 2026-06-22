"use client";

import { useQuery } from "@tanstack/react-query";
import { getMentoQuote } from "../lib/quotes/mentoQuoter";
import type { Quote } from "../lib/quotes/types";

const QUOTE_STALE_MS = 30_000; // invalidate before confirm if stale >30s

/**
 * Poll a Mento USDT→COPm quote every 5 seconds (≈1 Celo block).
 * Returns undefined until the first successful fetch.
 *
 * @param amountInRaw - USDT in raw units (6 dec). Pass 0n to disable.
 * @param chainId     - 42220 (mainnet), 11142220 (Celo Sepolia), undefined = no chain
 */
export function useQuotes(amountInRaw: bigint, chainId: number | undefined) {
  return useQuery<Quote>({
    queryKey: ["fxcop-quote", chainId, amountInRaw.toString()],
    queryFn: () => getMentoQuote(amountInRaw, chainId as number),
    enabled: amountInRaw > 0n && chainId !== undefined,
    refetchInterval: 5_000,
    staleTime: QUOTE_STALE_MS,
    gcTime: 60_000,
    retry: 2,
    retryDelay: 1_000,
  });
}

export { QUOTE_STALE_MS };

