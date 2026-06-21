import { QuoteService, RouteService, PoolService, SwapService } from "@mento-protocol/mento-sdk";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { MAINNET } from "../contracts";
import type { RouteQuote } from "./types";

const publicClient = createPublicClient({ chain: celo, transport: http() });
const CELO_CHAIN_ID = 42220;

// Services are stateful (cache routes + pools) — instantiate once per session
let _services: {
  poolService: PoolService;
  routeService: RouteService;
  quoteService: QuoteService;
  swapService: SwapService;
} | null = null;

async function getServices() {
  if (!_services) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = publicClient as any;
    const poolService = new PoolService(pc, CELO_CHAIN_ID);
    const routeService = new RouteService(pc, CELO_CHAIN_ID, poolService);
    const quoteService = new QuoteService(pc, CELO_CHAIN_ID, routeService);
    const swapService = new SwapService(pc, CELO_CHAIN_ID, routeService, quoteService);
    _services = { poolService, routeService, quoteService, swapService };
  }
  return _services;
}

/**
 * Get a Mento quote for USDT → COPm.
 * Uses @mento-protocol/mento-sdk QuoteService which discovers routes on-chain,
 * finding the correct factory/exchange-provider address for each hop automatically.
 *
 * @param amountInRaw - USDT amount in raw units (6 decimals)
 */
export async function getMentoQuote(amountInRaw: bigint): Promise<RouteQuote> {
  if (amountInRaw === 0n) return unavailable();

  try {
    const { quoteService } = await getServices();

    const amountOut = await quoteService.getAmountOut(
      MAINNET.USDT,
      MAINNET.COPM,
      amountInRaw
    );

    if (!amountOut || amountOut === 0n) {
      console.warn("[mentoQuoter] getAmountOut returned 0");
      return unavailable();
    }

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
  } catch (err) {
    console.error("[mentoQuoter] failed:", err);
    return unavailable();
  }
}

/**
 * Build the ABI-encoded calldata for the Mento route.
 * Uses SwapService so the SDK resolves the correct factory addresses on-chain.
 * Called by useSwap — only after a successful getMentoQuote.
 */
export async function buildMentoRouteData(
  amountIn: bigint,
  minAmountOut: bigint,
  recipient: `0x${string}`,
  deadline: bigint
): Promise<`0x${string}`> {
  const { swapService } = await getServices();

  const result = await swapService.buildSwapParams(
    MAINNET.USDT,
    MAINNET.COPM,
    amountIn,
    recipient,
    { slippageTolerance: 0, deadline },  // slippage = 0: we handle it with minAmountOut
  );

  // encodeSwapCall: swapExactTokensForTokens(amountIn, minOut, routes, recipient, deadline)
  return swapService.encodeSwapCall(
    amountIn,
    minAmountOut,
    result.routerRoutes,
    recipient,
    deadline
  ) as `0x${string}`;
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
