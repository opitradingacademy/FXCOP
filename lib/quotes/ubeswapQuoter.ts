import { createPublicClient, http, parseAbi } from "viem";
import { celo } from "viem/chains";
import { MAINNET } from "../contracts";
import type { RouteQuote } from "./types";

const publicClient = createPublicClient({ chain: celo, transport: http() });

// Minimum pool TVL in USD (raw USDT, 6 dec) to consider Ubeswap route valid.
// Below this we skip — thin pools mean high slippage for real users.
const MIN_TVL_USDT = 1_000_000_000n; // $1,000 in USDT 6-dec units

const QUOTER_V2_ABI = parseAbi([
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

const POOL_ABI = parseAbi([
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
  "function token0() external view returns (address)",
]);

const FACTORY_ABI = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
]);

// Ubeswap V3 pool fee tiers to probe (in order of preference for stablecoin pairs)
const FEE_TIERS: readonly number[] = [500, 3000, 10000];

/**
 * Get a Ubeswap V3 quote for USDT → COPm.
 * Returns isAvailable=false if no pool exists or TVL is below threshold.
 *
 * @param amountInRaw - USDT amount in raw units (6 decimals)
 */
export async function getUbeswapQuote(amountInRaw: bigint): Promise<RouteQuote> {
  try {
    const poolInfo = await findBestPool();
    if (!poolInfo) {
      console.warn("[ubeswapQuoter] no USDT/COPm pool found on any fee tier");
      return unavailable();
    }

    const { poolAddress, fee } = poolInfo;
    console.log(`[ubeswapQuoter] pool found: ${poolAddress} fee=${fee}`);

    // TVL guard: check USDT balance of pool
    const tvl = await getPoolUsdtTvl(poolAddress);
    console.log(`[ubeswapQuoter] pool TVL (USDT raw): ${tvl}`);
    if (tvl < MIN_TVL_USDT) {
      console.warn(`[ubeswapQuoter] TVL too low: ${tvl} < ${MIN_TVL_USDT}`);
      return unavailable();
    }

    // Quote via QuoterV2
    const result = (await publicClient.readContract({
      address: MAINNET.UBESWAP_QUOTER_V2 as `0x${string}`,
      abi: QUOTER_V2_ABI,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: MAINNET.USDT as `0x${string}`,
          tokenOut: MAINNET.COPM as `0x${string}`,
          amountIn: amountInRaw,
          fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    })) as readonly [bigint, bigint, number, bigint];

    const [amountOut, , , gasEstimate] = result;
    const feeApp = (amountOut * 5n) / 10_000n;
    const amountOutNet = amountOut - feeApp;

    return {
      routeType: "ubeswap",
      amountOut,
      amountOutNet,
      amountOutFormatted: formatCOPmForDisplay(amountOutNet),
      feeApp,
      gasEstimate,
      savingsVsBaseline: 0n,
      isAvailable: true,
      poolFee: fee,
    };
  } catch (err) {
    console.error("[ubeswapQuoter] failed:", err);
    return unavailable();
  }
}

async function findBestPool(): Promise<{ poolAddress: `0x${string}`; fee: number } | null> {
  for (const fee of FEE_TIERS) {
    try {
      const pool = await publicClient.readContract({
        address: MAINNET.UBESWAP_FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "getPool",
        args: [
          MAINNET.USDT as `0x${string}`,
          MAINNET.COPM as `0x${string}`,
          fee,
        ],
      });

      if (pool && pool !== "0x0000000000000000000000000000000000000000") {
        return { poolAddress: pool as `0x${string}`, fee };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function getPoolUsdtTvl(poolAddress: `0x${string}`): Promise<bigint> {
  // Check USDT balance as proxy for TVL
  const balanceAbi = parseAbi([
    "function balanceOf(address account) external view returns (uint256)",
  ]);
  const balance = await publicClient.readContract({
    address: MAINNET.USDT as `0x${string}`,
    abi: balanceAbi,
    functionName: "balanceOf",
    args: [poolAddress],
  });
  return balance;
}

function formatCOPmForDisplay(raw: bigint): string {
  const whole = raw / 10n ** 18n;
  const fraction = raw % 10n ** 18n;
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 2);
  return `${whole.toLocaleString("es-CO")}.${fractionStr}`;
}

function unavailable(): RouteQuote {
  return {
    routeType: "ubeswap",
    amountOut: 0n,
    amountOutNet: 0n,
    amountOutFormatted: "0.00",
    feeApp: 0n,
    gasEstimate: 0n,
    savingsVsBaseline: 0n,
    isAvailable: false,
  };
}
