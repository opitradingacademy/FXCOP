import { QuoteService, RouteService, PoolService } from "@mento-protocol/mento-sdk";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { MAINNET } from "../contracts";
import type { RouteQuote } from "./types";

const publicClient = createPublicClient({ chain: celo, transport: http() });
const CELO_CHAIN_ID = 42220;

// Services are stateful (cache routes) — instantiate once
let _quoteService: QuoteService | null = null;

async function getQuoteService(): Promise<QuoteService> {
  if (!_quoteService) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = publicClient as any;
    const poolService = new PoolService(pc, CELO_CHAIN_ID);
    const routeService = new RouteService(pc, CELO_CHAIN_ID, poolService);
    _quoteService = new QuoteService(pc, CELO_CHAIN_ID, routeService);
  }
  return _quoteService;
}

/**
 * Get a Mento quote for USDT → COPm.
 * Uses @mento-protocol/mento-sdk QuoteService which handles USDT → USDm → COPm multi-hop.
 *
 * @param amountInRaw - USDT amount in raw units (6 decimals)
 */
export async function getMentoQuote(amountInRaw: bigint): Promise<RouteQuote> {
  try {
    const quoteService = await getQuoteService();

    const amountOut = await quoteService.getAmountOut(
      MAINNET.USDT,
      MAINNET.COPM,
      amountInRaw
    );

    const feeApp = (amountOut * 5n) / 10_000n;
    const amountOutNet = amountOut - feeApp;

    return {
      routeType: "mento",
      amountOut,
      amountOutNet,
      amountOutFormatted: formatCOPmForDisplay(amountOutNet),
      feeApp,
      gasEstimate: 300_000n,
      savingsVsBaseline: 0n,
      isAvailable: true,
    };
  } catch {
    return unavailable();
  }
}

function formatCOPmForDisplay(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  const fraction = raw % 10n ** 18n;
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 2);
  return `${whole.toLocaleString("es-CO")}.${fractionStr}`;
}

function unavailable(): RouteQuote {
  return {
    routeType: "mento",
    amountOut: 0n,
    amountOutNet: 0n,
    amountOutFormatted: "0.00",
    feeApp: 0n,
    gasEstimate: 0n,
    savingsVsBaseline: 0n,
    isAvailable: false,
  };
}
