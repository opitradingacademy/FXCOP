/**
 * lib/contracts.ts
 * Contract addresses for FXCOP on Celo L2.
 *
 * MAINNET: Celo 42220
 * TESTNET: Celo Sepolia 11142220
 *
 * INVARIANT: feeCurrency MUST always be USDT_FEE_ADAPTER (not the token address).
 *
 * v1 scope: USDT → COPm via Mento SDK. No custom router, no Ubeswap.
 */

// ---------------------------------------------------------------------------
// Mainnet — Celo (chainId 42220)
// ---------------------------------------------------------------------------
export const MAINNET = {
  /** USDT on Celo mainnet (6 decimals) */
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",

  /** USDT Fee Currency Adapter — use as feeCurrency on EVERY transaction */
  USDT_FEE_ADAPTER: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",

  /** COPm — Colombian Peso stablecoin on Celo (18 decimals) */
  COPM: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",

  /** USDm — USD stablecoin hub for Mento routes (18 decimals) */
  USDM: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
} as const;

// ---------------------------------------------------------------------------
// Testnet — Celo Sepolia (chainId 11155111)
// ---------------------------------------------------------------------------
export const TESTNET = {
  /** USDT on Celo Sepolia testnet (6 decimals) */
  USDT: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",

  /** USDT on Celo Sepolia testnet (placeholder — verify before mainnet) */
  USDT_FEE_ADAPTER: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",

  /** COPm on Celo Sepolia testnet (18 decimals) */
  COPM: "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67",

  /** USDm on Celo Sepolia testnet (18 decimals) */
  USDM: "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80",
} as const;

// ---------------------------------------------------------------------------
// Chain IDs
// ---------------------------------------------------------------------------
export const CELO_MAINNET_CHAIN_ID = 42220;
// Celo Sepolia is the official L2 testnet (replaced the old L1 Alfajores 44787).
// wagmi v2's `celoAlfajores` chain points to 11142220.
export const CELO_SEPOLIA_CHAIN_ID = 11142220;
export const CELO_TESTNET_CHAIN_ID = CELO_SEPOLIA_CHAIN_ID;

// ---------------------------------------------------------------------------
// Helper — typed contract accessor
// ---------------------------------------------------------------------------
type MainnetContracts = typeof MAINNET;
type TestnetContracts = typeof TESTNET;

/**
 * Returns the contract address map for the given chainId.
 * Throws for unsupported chains to prevent silent misrouting.
 */
export function getContracts(chainId: number): MainnetContracts | TestnetContracts {
  switch (chainId) {
    case CELO_MAINNET_CHAIN_ID:
      return MAINNET;
    case CELO_TESTNET_CHAIN_ID:
      return TESTNET;
    default:
      throw new Error(
        `Unsupported chainId ${chainId}. FXCOP only supports Celo mainnet (42220) and Celo Sepolia (11142220).`
      );
  }
}

/**
 * True if the chainId is a Celo testnet (any version).
 * 11142220 = Celo Sepolia (L2, current)
 * 44787 = Alfajores (L1, legacy but still around in some wallets)
 */
export function isCeloTestnet(chainId: number | undefined): boolean {
  if (chainId === undefined) return false;
  return chainId === 11142220 || chainId === 44787;
}

