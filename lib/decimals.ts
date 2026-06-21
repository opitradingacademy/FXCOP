/**
 * lib/decimals.ts
 * All decimal conversions for FXCOP.
 *
 * USDT  → 6 decimals
 * COPm  → 18 decimals
 * USDm  → 18 decimals
 *
 * RULE: NEVER use `number` for monetary amounts. All raw values are bigint.
 */

const USDT_DEC = 6n;
const COPM_DEC = 18n;

const USDT_SCALE = 10n ** USDT_DEC; // 1_000_000n
const COPM_SCALE = 10n ** COPM_DEC; // 1_000_000_000_000_000_000n

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a human-readable USDT string into raw bigint (6 decimals).
 * "100.00" → 100_000_000n
 * Strips leading $, commas, and whitespace.
 */
export function parseUsdt(amount: string): bigint {
  return parseFixed(amount, USDT_DEC);
}

/**
 * Parse a human-readable COPm string into raw bigint (18 decimals).
 * "420000.50" → 420_000_500_000_000_000_000_000n
 */
export function parseCOPm(amount: string): bigint {
  return parseFixed(amount, COPM_DEC);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format raw USDT bigint (6 dec) to human-readable string with 2 decimal places.
 * 100_000_000n → "100.00"
 */
export function formatUsdt(raw: bigint): string {
  return formatFixed(raw, USDT_DEC, 2);
}

/**
 * Format raw COPm bigint (18 dec) to human-readable string with 2 decimal places
 * and thousand separators.
 * 420_000_500_000_000_000_000_000n → "420,000.50"
 */
export function formatCOPm(raw: bigint): string {
  const formatted = formatFixed(raw, COPM_DEC, 2);
  // Add thousand separators to the integer part
  const [intPart, decPart] = formatted.split(".");
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withSeparators}.${decPart}` : withSeparators;
}

// ---------------------------------------------------------------------------
// Fee & slippage math
// ---------------------------------------------------------------------------

/**
 * Calculate protocol fee in the same unit as amountIn.
 * calcFee(100_000_000n, 5) → 50_000n  (0.05% of USDT)
 *
 * @param amountIn  Raw token amount (bigint)
 * @param bps       Basis points (e.g. 5 = 0.05%)
 */
export function calcFee(amountIn: bigint, bps: number): bigint {
  return (amountIn * BigInt(bps)) / 10_000n;
}

/**
 * Calculate minimum acceptable output after slippage.
 * calcMinAmountOut(420000n * 10n**18n, 1) → 99% of the quote COPm
 *
 * @param quote        Quoted COPm output (18 dec bigint)
 * @param slippagePct  Slippage percentage (e.g. 1 = 1%)
 */
export function calcMinAmountOut(quote: bigint, slippagePct: number): bigint {
  const slippageBps = BigInt(Math.round(slippagePct * 100)); // 1% → 100 bps
  return (quote * (10_000n - slippageBps)) / 10_000n;
}

/**
 * Compute the effective exchange rate: how many COPm per 1 USDT.
 *
 * @param usdtRaw  Raw USDT amount (6 dec)
 * @param copRaw   Raw COPm amount (18 dec)
 * @returns        Number — rate only, safe for display (never used in arithmetic)
 */
export function effectiveRate(usdtRaw: bigint, copRaw: bigint): number {
  if (usdtRaw === 0n) return 0;
  // rate = (copRaw / 1e18) / (usdtRaw / 1e6)
  // To avoid float loss with extreme values, scale to avoid tiny floats:
  // rate = copRaw * 1e6 / (usdtRaw * 1e18)  — but keep in bigint until final division
  const numerator = copRaw * USDT_SCALE; // copRaw * 1e6
  const denominator = usdtRaw * COPM_SCALE; // usdtRaw * 1e18
  // Use integer division scaled by 1e6 to retain precision, then convert
  const rateScaled = (numerator * 1_000_000n) / denominator;
  return Number(rateScaled) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse a decimal string into a fixed-point bigint with `decimals` precision.
 * Strips $, commas, and whitespace. Handles missing or partial decimal parts.
 */
function parseFixed(amount: string, decimals: bigint): bigint {
  // Sanitize
  const cleaned = amount.replace(/[$,\s]/g, "").trim();
  if (!cleaned || cleaned === "0") return 0n;

  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) {
    // No decimal point
    return BigInt(cleaned) * 10n ** decimals;
  }

  const intPart = cleaned.slice(0, dotIndex);
  const rawFrac = cleaned.slice(dotIndex + 1);

  const decN = Number(decimals);

  // Truncate or pad fractional part to exactly `decimals` digits
  const frac = rawFrac.slice(0, decN).padEnd(decN, "0");

  const intBig = BigInt(intPart || "0") * 10n ** decimals;
  const fracBig = BigInt(frac);

  return intBig + fracBig;
}

/**
 * Format a fixed-point bigint with `decimals` precision to a decimal string
 * with `displayDecimals` places.
 */
function formatFixed(raw: bigint, decimals: bigint, displayDecimals: number): string {
  const scale = 10n ** decimals;
  const isNeg = raw < 0n;
  const abs = isNeg ? -raw : raw;

  const intPart = abs / scale;
  const fracPart = abs % scale;

  // Left-pad fractional part to full decimal width
  const fracStr = fracPart.toString().padStart(Number(decimals), "0");
  // Truncate to displayDecimals
  const displayFrac = fracStr.slice(0, displayDecimals).padEnd(displayDecimals, "0");

  const result = `${intPart}.${displayFrac}`;
  return isNeg ? `-${result}` : result;
}
