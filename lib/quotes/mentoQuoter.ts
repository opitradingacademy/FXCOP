import { createPublicClient, http, parseAbi } from "viem";
import { celo } from "viem/chains";
import { MAINNET } from "../contracts";
import type { RouteQuote } from "./types";

const publicClient = createPublicClient({ chain: celo, transport: http() });

// Mento Router V3 ABI — only the view functions we need
const MENTO_ROUTER_ABI = parseAbi([
  "function getAmountsOut(uint256 amountIn, (address from, address to, address factory)[] routes) external view returns (uint256[] amounts)",
]);

// Hardcoded 2-hop route: USDT → USDm → COPm
// All Mento FPMM pools use BiPoolManager as their factory.
const MENTO_ROUTES = [
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
] as const;

/**
 * Get a Mento quote for USDT → COPm via Router V3 getAmountsOut.
 * Calls the router directly — no SDK dependency, works for any token the router supports.
 *
 * @param amountInRaw - USDT amount in raw units (6 decimals)
 */
export async function getMentoQuote(amountInRaw: bigint): Promise<RouteQuote> {
  if (amountInRaw === 0n) return unavailable();

  try {
    const amounts = await publicClient.readContract({
      address: MAINNET.MENTO_ROUTER_V3 as `0x${string}`,
      abi: MENTO_ROUTER_ABI,
      functionName: "getAmountsOut",
      args: [amountInRaw, MENTO_ROUTES],
    });

    // amounts[0] = amountIn (USDT), amounts[1] = USDm, amounts[2] = COPm gross
    const grossAmountOut = amounts[amounts.length - 1];
    if (!grossAmountOut || grossAmountOut === 0n) return unavailable();

    const feeApp = (grossAmountOut * 5n) / 10_000n;
    const amountOutNet = grossAmountOut - feeApp;

    return {
      routeType: "mento",
      amountOut: grossAmountOut,
      amountOutNet,
      amountOutFormatted: formatCOPmForDisplay(amountOutNet),
      feeApp,
      gasEstimate: 300_000n,
      savingsVsBaseline: 0n,
      isAvailable: true,
    };
  } catch (err) {
    console.error("[mentoQuoter] getAmountsOut failed:", err);
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
