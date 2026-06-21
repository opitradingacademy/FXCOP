export type RouteQuote = {
  routeType: "mento" | "ubeswap" | "best";
  amountOut: bigint;          // COPm raw 18 dec — ANTES del fee FXCOP
  amountOutNet: bigint;       // COPm raw — DESPUÉS del fee (lo que recibe el usuario)
  amountOutFormatted: string; // amountOutNet formateado para UI
  feeApp: bigint;             // 0.05% en COPm raw (18 dec)
  gasEstimate: bigint;
  savingsVsBaseline: bigint;  // vs Mento directo, en COPm raw
  isAvailable: boolean;
  /** Ubeswap V3 pool fee tier (e.g. 500, 3000, 10000). Only set for routeType=ubeswap. */
  poolFee?: number;
};

export type SwapState = "idle" | "approving" | "approved" | "swapping" | "success" | "error";

export type TxConfig = {
  feeCurrency: `0x${string}`;
  gasPrice: bigint;
};
