/**
 * lib/quotes/types.ts
 * Simple types for the Mento-direct USDT → COPm flow.
 *
 * No aggregator, no fee model, no router of our own.
 * The Mento SDK gives us the net amount the user will receive.
 */

export type Quote = {
  /** COPm raw 18-dec — what the user will receive (after slippage) */
  amountOut: bigint;
  /** COPm raw 18-dec — the expected amount before slippage */
  amountOutExpected: bigint;
  /** amountOut formatted with thousand separators for UI */
  amountOutFormatted: string;
  /** Estimated gas in wei (raw bigint) */
  gasEstimate: bigint;
  /** True when Mento returned a valid quote */
  isAvailable: boolean;
};

export type SwapState =
  | "idle"
  | "building"
  | "approving"
  | "swapping"
  | "success"
  | "error";
