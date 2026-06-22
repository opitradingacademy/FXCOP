/**
 * lib/quotes/mentoQuoter.ts
 * Mento SDK direct: USDT → COPm, no aggregator, no fee.
 *
 * Uses @mento-protocol/mento-sdk. The SDK abstracts multi-hop routing
 * (e.g. USDT→USDm→COPm), discovers pools on-chain, and handles
 * circuit-breaker/oracle validation internally.
 *
 * We cache the Mento instance per chainId to avoid re-bootstrapping
 * services (each call would re-fetch pool/route data otherwise).
 */

import { Mento } from "@mento-protocol/mento-sdk";
import { formatCOPm } from "../decimals";
import { CELO_MAINNET_CHAIN_ID, CELO_TESTNET_CHAIN_ID, getContracts } from "../contracts";
import type { Quote } from "./types";

// Cached Mento instances per chainId
const mentoCache: Map<number, Mento> = new Map();

async function getMento(chainId: number): Promise<Mento> {
  if (!mentoCache.has(chainId)) {
    const mento = await Mento.create(chainId);
    mentoCache.set(chainId, mento);
  }
  return mentoCache.get(chainId)!;
}

/**
 * Get a Mento quote for USDT → COPm on the given chain.
 * Returns isAvailable=false if no route exists or the SDK reverts.
 *
 * @param amountInRaw - USDT amount in raw units (6 decimals)
 * @param chainId     - 42220 (mainnet) or 11155111 (Celo Sepolia)
 */
export async function getMentoQuote(amountInRaw: bigint, chainId: number): Promise<Quote> {
  if (amountInRaw === 0n) return unavailable();

  if (chainId !== CELO_MAINNET_CHAIN_ID && chainId !== CELO_TESTNET_CHAIN_ID) {
    console.error(`[mentoQuoter] unsupported chainId: ${chainId}`);
    return unavailable();
  }

  try {
    const mento = await getMento(chainId);
    const contracts = getContracts(chainId);
    const amountOut = await mento.quotes.getAmountOut(
      contracts.USDT,
      contracts.COPM,
      amountInRaw
    );

    if (!amountOut || amountOut === 0n) {
      console.warn("[mentoQuoter] getAmountOut returned 0 — no liquidity or no route");
      return unavailable();
    }

    return {
      amountOut,                    // Mento returns expected output (pre-slippage)
      amountOutExpected: amountOut,
      amountOutFormatted: formatCOPm(amountOut),
      gasEstimate: 300_000n,        // Mento multi-hop is ~250k–350k gas
      isAvailable: true,
    };
  } catch (err) {
    console.error("[mentoQuoter] quote failed:", err);
    return unavailable();
  }
}

function unavailable(): Quote {
  return {
    amountOut: 0n,
    amountOutExpected: 0n,
    amountOutFormatted: "0.00",
    gasEstimate: 0n,
    isAvailable: false,
  };
}
