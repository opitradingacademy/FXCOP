"use client";

import { useQuery } from "@tanstack/react-query";
import { getAggregatedQuotes, type AggregatedQuotes } from "../lib/quotes/aggregator";

const QUOTE_STALE_MS = 30_000; // invalidate before confirm screen if stale >30s

/**
 * Poll aggregated USDT→COPm quotes every 5 seconds (≈1 Celo block).
 * Returns undefined until the first successful fetch.
 *
 * @param amountInRaw - USDT in raw units (6 dec). Pass 0n to disable fetching.
 */
export function useQuotes(amountInRaw: bigint) {
  return useQuery<AggregatedQuotes>({
    queryKey: ["fxcop-quotes", amountInRaw.toString()],
    queryFn: () => getAggregatedQuotes(amountInRaw),
    enabled: amountInRaw > 0n,
    refetchInterval: 5_000,
    staleTime: QUOTE_STALE_MS,
    gcTime: 60_000,
    retry: 2,
    retryDelay: 1_000,
  });
}

export { QUOTE_STALE_MS };
