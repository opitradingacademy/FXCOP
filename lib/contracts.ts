/**
 * lib/contracts.ts
 * Contract addresses for FXCOP on Celo L2.
 *
 * MAINNET: Celo 42220
 * TESTNET: Celo Sepolia 11155111
 *
 * INVARIANT: feeCurrency MUST always be USDT_FEE_ADAPTER (not the token address).
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

  /** Mento Broker V2 — executes swaps through FPMM pools */
  MENTO_BROKER_V2: "0x777A8255cA72412f0d706dc03C9D1987306B4CaD",

  /** Mento Router V3 — preferred router for USDT→USDm→COPm */
  MENTO_ROUTER_V3: "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6",

  /** Mento FPMM pool for USDT/USDm */
  MENTO_FPMM_USDT_USDM: "0x0FEBa760d93423D127DE1B6ABECdB60E5253228D",

  /** Ubeswap V3 Universal Router */
  UBESWAP_ROUTER: "0x3C255DED9B25f0BFB4EF1D14234BD2514d7A7A0d",

  /** Mento BiPoolManager — used as factory address in multi-hop route encoding */
  MENTO_BIPOOLMANAGER: "0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901",

  /** Ubeswap V3 Factory — used for pool existence + TVL check */
  UBESWAP_FACTORY: "0x67FEa58D5a5a4162cED847E13c2c81c73bf8aeC4",

  /**
   * QuoterV2 for off-chain USDT→COPm price simulation via Ubeswap V3 pools.
   * Using Uniswap V3 QuoterV2 on Celo — compatible with V3-fork pools.
   * TODO: verify this works with Ubeswap V3 pool contracts on mainnet.
   */
  UBESWAP_QUOTER_V2: "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8",
} as const;

// ---------------------------------------------------------------------------
// Testnet — Celo Sepolia (chainId 11155111)
// ---------------------------------------------------------------------------
export const TESTNET = {
  /** USDT on Celo Sepolia testnet */
  USDT: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",

  /** COPm on Celo Sepolia testnet */
  COPM: "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67",

  /** USDm on Celo Sepolia testnet */
  USDM: "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80",
} as const;

// ---------------------------------------------------------------------------
// Chain IDs
// ---------------------------------------------------------------------------
export const CELO_MAINNET_CHAIN_ID = 42220;
export const CELO_TESTNET_CHAIN_ID = 11155111;

// ---------------------------------------------------------------------------
// Helper — typed contract accessor
// ---------------------------------------------------------------------------
type MainnetContracts = typeof MAINNET;
type TestnetContracts = typeof TESTNET;

/**
 * Returns the contract address map for the given chainId.
 * Mainnet returns all 9 addresses; testnet returns the 3 deployed addresses.
 *
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
        `Unsupported chainId ${chainId}. FXCOP only supports Celo mainnet (42220) and Celo Sepolia (11155111).`
      );
  }
}
