import { describe, it, expect } from "vitest";
import {
  MAINNET,
  TESTNET,
  CELO_MAINNET_CHAIN_ID,
  CELO_TESTNET_CHAIN_ID,
  getContracts,
} from "../lib/contracts";

// ---------------------------------------------------------------------------
// Address snapshot guard — catches accidental typos / address changes
// ---------------------------------------------------------------------------
describe("MAINNET addresses", () => {
  it("USDT matches spec", () => {
    expect(MAINNET.USDT).toBe("0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e");
  });

  it("USDT_FEE_ADAPTER matches spec (feeCurrency)", () => {
    expect(MAINNET.USDT_FEE_ADAPTER).toBe(
      "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72"
    );
  });

  it("COPM matches spec", () => {
    expect(MAINNET.COPM).toBe("0x8A567e2aE79CA692Bd748aB832081C45de4041eA");
  });

  it("USDM matches spec", () => {
    expect(MAINNET.USDM).toBe("0x765DE816845861e75A25fCA122bb6898B8B1282a");
  });

  it("MENTO_BROKER_V2 matches spec", () => {
    expect(MAINNET.MENTO_BROKER_V2).toBe(
      "0x777A8255cA72412f0d706dc03C9D1987306B4CaD"
    );
  });

  it("MENTO_ROUTER_V3 matches spec", () => {
    expect(MAINNET.MENTO_ROUTER_V3).toBe(
      "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6"
    );
  });

  it("MENTO_FPMM_USDT_USDM matches spec", () => {
    expect(MAINNET.MENTO_FPMM_USDT_USDM).toBe(
      "0x0FEBa760d93423D127DE1B6ABECdB60E5253228D"
    );
  });

  it("UBESWAP_ROUTER matches spec", () => {
    expect(MAINNET.UBESWAP_ROUTER).toBe(
      "0x3C255DED9B25f0BFB4EF1D14234BD2514d7A7A0d"
    );
  });

  it("UBESWAP_FACTORY matches spec", () => {
    expect(MAINNET.UBESWAP_FACTORY).toBe(
      "0x67FEa58D5a5a4162cED847E13c2c81c73bf8aeC4"
    );
  });

  it("UBESWAP_QUOTER_V2 matches Uniswap V3 QuoterV2 on Celo", () => {
    expect(MAINNET.UBESWAP_QUOTER_V2).toBe(
      "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8"
    );
  });

  it("MENTO_BIPOOLMANAGER is BiPoolManager from Mento SDK", () => {
    expect(MAINNET.MENTO_BIPOOLMANAGER).toBe(
      "0x22d9db95E6Ae61c104A7B6F6C78D7993B94ec901"
    );
  });

  it("exposes exactly 11 addresses", () => {
    expect(Object.keys(MAINNET).length).toBe(11);
  });
});

describe("TESTNET addresses", () => {
  it("USDT matches spec", () => {
    expect(TESTNET.USDT).toBe("0xd077A400968890Eacc75cdc901F0356c943e4fDb");
  });

  it("COPM matches spec", () => {
    expect(TESTNET.COPM).toBe("0x5F8d55c3627d2dc0a2B4afa798f877242F382F67");
  });

  it("USDM matches spec", () => {
    expect(TESTNET.USDM).toBe("0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80");
  });
});

// ---------------------------------------------------------------------------
// getContracts helper
// ---------------------------------------------------------------------------
describe("getContracts", () => {
  it("returns MAINNET for chainId 42220", () => {
    expect(getContracts(CELO_MAINNET_CHAIN_ID)).toBe(MAINNET);
  });

  it("returns TESTNET for chainId 11155111", () => {
    expect(getContracts(CELO_TESTNET_CHAIN_ID)).toBe(TESTNET);
  });

  it("throws for unsupported chainId", () => {
    expect(() => getContracts(1)).toThrow("Unsupported chainId 1");
  });

  it("throws for Polygon chainId", () => {
    expect(() => getContracts(137)).toThrow("Unsupported chainId 137");
  });
});
