// @vitest-environment jsdom
/**
 * Tests for hooks/useWallet.ts
 *
 * CAP-01 scenarios:
 * 1. isMiniPay=true → auto-connects, no connect button
 * 2. isMiniPay=false → does not auto-connect
 * 3. balance fetch timeout → returns 0n (fallback)
 *
 * Strategy: mock wagmi hooks + window.ethereum.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { FEE_CURRENCY } from "../hooks/useWallet";
import { MAINNET } from "../lib/contracts";

// ---------------------------------------------------------------------------
// Mock wagmi hooks
// ---------------------------------------------------------------------------
const mockConnect = vi.fn();
let mockAddress: `0x${string}` | undefined = undefined;
let mockIsConnected = false;
let mockIsPending = false;
let mockRawBalance: bigint | undefined = undefined;
let mockIsBalanceLoading = false;

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mockAddress, isConnected: mockIsConnected }),
  useConnect: () => ({ connect: mockConnect, isPending: mockIsPending }),
  useReadContract: (params: unknown) => {
    if (!params) return { data: undefined, isLoading: false };
    return { data: mockRawBalance, isLoading: mockIsBalanceLoading };
  },
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" }),
}));

// ---------------------------------------------------------------------------
// Helper: set window.ethereum mock
// ---------------------------------------------------------------------------
function setWindowEthereum(isMiniPay: boolean) {
  Object.defineProperty(window, "ethereum", {
    value: { isMiniPay },
    writable: true,
    configurable: true,
  });
}

function clearWindowEthereum() {
  Object.defineProperty(window, "ethereum", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Import hook after mocks are set up
// ---------------------------------------------------------------------------
// Dynamic import after mock setup
async function importHook() {
  const { useWallet } = await import("../hooks/useWallet");
  return useWallet;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useWallet", () => {
  beforeEach(() => {
    mockAddress = undefined;
    mockIsConnected = false;
    mockIsPending = false;
    mockRawBalance = undefined;
    mockIsBalanceLoading = false;
    mockConnect.mockClear();
  });

  afterEach(() => {
    clearWindowEthereum();
    vi.resetModules();
  });

  // CAP-01: Scenario — App loads inside MiniPay
  it("auto-connects when isMiniPay=true and not already connected", async () => {
    setWindowEthereum(true);
    const useWallet = await importHook();

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isMiniPay).toBe(true);
    });

    expect(mockConnect).toHaveBeenCalledWith({
      connector: expect.objectContaining({ id: "injected" }),
    });
  });

  // CAP-01: Scenario — App loads outside MiniPay
  it("does not auto-connect when isMiniPay=false", async () => {
    setWindowEthereum(false);
    const useWallet = await importHook();

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isMiniPay).toBe(false);
    });

    expect(mockConnect).not.toHaveBeenCalled();
  });

  // CAP-01: Scenario — App loads when window.ethereum is absent
  it("does not auto-connect when window.ethereum is undefined", async () => {
    clearWindowEthereum();
    const useWallet = await importHook();

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isMiniPay).toBe(false);
    });

    expect(mockConnect).not.toHaveBeenCalled();
  });

  // CAP-01: Scenario — Balance loaded successfully
  it("returns fetched USDT balance when connected", async () => {
    setWindowEthereum(true);
    mockAddress = "0x1234000000000000000000000000000000005678";
    mockIsConnected = true;
    mockRawBalance = 50_000_000n; // 50 USDT

    const useWallet = await importHook();
    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.usdtBalance).toBe(50_000_000n);
    });
  });

  // CAP-01: Scenario — Balance fetch timeout → fallback 0n
  it("falls back to 0n when balance fetch is still loading after address available", async () => {
    setWindowEthereum(true);
    mockAddress = "0x1234000000000000000000000000000000005678";
    mockIsConnected = true;
    mockRawBalance = undefined; // balance not resolved
    mockIsBalanceLoading = true;

    const useWallet = await importHook();
    const { result } = renderHook(() => useWallet());

    // Initial state: balance should be 0n (not yet loaded)
    expect(result.current.usdtBalance).toBe(0n);
  });

  // Invariant: feeCurrency is always USDT_FEE_ADAPTER
  it("FEE_CURRENCY constant equals USDT_FEE_ADAPTER from spec", () => {
    expect(FEE_CURRENCY.toLowerCase()).toBe(MAINNET.USDT_FEE_ADAPTER.toLowerCase());
  });
});
