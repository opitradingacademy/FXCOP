import { getMentoQuote } from "./mentoQuoter";
import { getUbeswapQuote } from "./ubeswapQuoter";
import type { RouteQuote } from "./types";

export type AggregatedQuotes = {
  mento: RouteQuote;
  ubeswap: RouteQuote;
  best: RouteQuote;
};

/**
 * Fetch Mento and Ubeswap quotes in parallel and return all three (including best).
 * The best route is whichever has the highest amountOutNet.
 * In v1 we pick ONE winner — no atomic split on-chain.
 *
 * @param amountInRaw - USDT amount in raw units (6 decimals)
 */
export async function getAggregatedQuotes(amountInRaw: bigint): Promise<AggregatedQuotes> {
  const [mento, ubeswap] = await Promise.all([
    getMentoQuote(amountInRaw),
    getUbeswapQuote(amountInRaw),
  ]);

  const best = selectBest(mento, ubeswap);

  // Compute savings vs Mento baseline for the best route
  if (best.routeType === "ubeswap" && mento.isAvailable) {
    best.savingsVsBaseline = best.amountOutNet - mento.amountOutNet;
  }

  return { mento, ubeswap, best: { ...best, routeType: "best" } };
}

function selectBest(mento: RouteQuote, ubeswap: RouteQuote): RouteQuote {
  if (!mento.isAvailable && !ubeswap.isAvailable) {
    return { ...mento, routeType: "best" };
  }
  if (!mento.isAvailable) return ubeswap;
  if (!ubeswap.isAvailable) return mento;
  return ubeswap.amountOutNet > mento.amountOutNet ? ubeswap : mento;
}
