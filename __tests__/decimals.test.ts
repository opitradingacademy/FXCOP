import { describe, it, expect } from "vitest";
import {
  parseUsdt,
  parseCOPm,
  formatUsdt,
  formatCOPm,
  calcFee,
  calcMinAmountOut,
  effectiveRate,
} from "../lib/decimals";

// ---------------------------------------------------------------------------
// parseUsdt
// ---------------------------------------------------------------------------
describe("parseUsdt", () => {
  it("parses whole number", () => {
    expect(parseUsdt("100")).toBe(100_000_000n);
  });

  it("parses decimal string", () => {
    expect(parseUsdt("100.00")).toBe(100_000_000n);
  });

  it("parses partial decimals", () => {
    expect(parseUsdt("100.5")).toBe(100_500_000n);
  });

  it("strips dollar sign and commas", () => {
    expect(parseUsdt("$1,000.00")).toBe(1_000_000_000n);
  });

  it("handles zero", () => {
    expect(parseUsdt("0")).toBe(0n);
  });

  it("handles empty string", () => {
    expect(parseUsdt("")).toBe(0n);
  });

  it("truncates extra decimal digits beyond 6", () => {
    // "1.1234567" → truncated to 6 places → 1.123456 → 1_123_456n
    expect(parseUsdt("1.1234567")).toBe(1_123_456n);
  });
});

// ---------------------------------------------------------------------------
// parseCOPm
// ---------------------------------------------------------------------------
describe("parseCOPm", () => {
  it("parses whole number", () => {
    expect(parseCOPm("420000")).toBe(420_000n * 10n ** 18n);
  });

  it("parses with 2 decimal places", () => {
    expect(parseCOPm("420000.50")).toBe(420_000_500_000_000_000_000_000n);
  });

  it("handles zero", () => {
    expect(parseCOPm("0")).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// formatUsdt
// ---------------------------------------------------------------------------
describe("formatUsdt", () => {
  it("formats 100 USDT", () => {
    expect(formatUsdt(100_000_000n)).toBe("100.00");
  });

  it("formats fractional USDT", () => {
    expect(formatUsdt(100_500_000n)).toBe("100.50");
  });

  it("formats zero", () => {
    expect(formatUsdt(0n)).toBe("0.00");
  });

  it("round-trip parse→format", () => {
    const raw = parseUsdt("99.99");
    expect(formatUsdt(raw)).toBe("99.99");
  });
});

// ---------------------------------------------------------------------------
// formatCOPm
// ---------------------------------------------------------------------------
describe("formatCOPm", () => {
  it("formats with thousand separator", () => {
    expect(formatCOPm(420_000n * 10n ** 18n)).toBe("420,000.00");
  });

  it("formats with decimal part", () => {
    expect(formatCOPm(420_000_500_000_000_000_000_000n)).toBe("420,000.50");
  });

  it("formats zero", () => {
    expect(formatCOPm(0n)).toBe("0.00");
  });

  it("round-trip parse→format", () => {
    const raw = parseCOPm("1234567.89");
    expect(formatCOPm(raw)).toBe("1,234,567.89");
  });

  it("formats millions", () => {
    expect(formatCOPm(1_000_000n * 10n ** 18n)).toBe("1,000,000.00");
  });
});

// ---------------------------------------------------------------------------
// calcFee
// ---------------------------------------------------------------------------
describe("calcFee", () => {
  it("calculates 0.05% fee on 100 USDT (6 dec)", () => {
    // 100 USDT = 100_000_000n; 0.05% = 5 bps → 50_000n
    expect(calcFee(100_000_000n, 5)).toBe(50_000n);
  });

  it("calculates fee on 1 USDT", () => {
    // 1_000_000n * 5 / 10000 = 500n
    expect(calcFee(1_000_000n, 5)).toBe(500n);
  });

  it("returns 0 for 0 input", () => {
    expect(calcFee(0n, 5)).toBe(0n);
  });

  it("works with 10 bps (0.1%)", () => {
    expect(calcFee(100_000_000n, 10)).toBe(100_000n);
  });
});

// ---------------------------------------------------------------------------
// calcMinAmountOut
// ---------------------------------------------------------------------------
describe("calcMinAmountOut", () => {
  it("applies 1% slippage to COPm quote", () => {
    const quote = 420_000n * 10n ** 18n;
    const min = calcMinAmountOut(quote, 1);
    // 99% of quote
    expect(min).toBe((quote * 9_900n) / 10_000n);
  });

  it("returns 99% of input on 1% slippage", () => {
    const quote = 1_000_000n * 10n ** 18n;
    const min = calcMinAmountOut(quote, 1);
    expect(min).toBe(990_000n * 10n ** 18n);
  });

  it("handles 0% slippage — returns full quote", () => {
    const quote = 100n * 10n ** 18n;
    expect(calcMinAmountOut(quote, 0)).toBe(quote);
  });

  it("handles 0 quote", () => {
    expect(calcMinAmountOut(0n, 1)).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// effectiveRate
// ---------------------------------------------------------------------------
describe("effectiveRate", () => {
  it("returns TRM when 100 USDT → 420000 COPm", () => {
    const usdt = parseUsdt("100");
    const cop = parseCOPm("420000");
    const rate = effectiveRate(usdt, cop);
    expect(rate).toBeCloseTo(4200, 1);
  });

  it("returns 0 when usdtRaw is 0", () => {
    expect(effectiveRate(0n, parseCOPm("420000"))).toBe(0);
  });

  it("returns 1 when equal units (1 USDT → 1 USDm in same value)", () => {
    const usdt = parseUsdt("1");
    // 1 COPm in 18 dec units scaled to match 1 USDT
    const cop = parseCOPm("1");
    const rate = effectiveRate(usdt, cop);
    expect(rate).toBeCloseTo(1, 6);
  });
});
