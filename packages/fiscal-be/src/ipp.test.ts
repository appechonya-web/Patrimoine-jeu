import { describe, expect, it } from "vitest";
import { IPP_2026, applySocialContributions, calculateIpp } from "./ipp.js";

describe("calculateIpp", () => {
  it("applies the tax-free allowance before the first bracket", () => {
    const result = calculateIpp(10_910, IPP_2026, 0.07);
    expect(result.federalTax).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it("taxes income progressively across brackets", () => {
    const result = calculateIpp(30_000, IPP_2026, 0);
    // (30000 - 10910) taxable = 19090
    // 15200 @25% = 3800; remaining 3890 @40% = 1556
    expect(result.federalTax).toBeCloseTo(3800 + 1556, 2);
  });

  it("adds the communal surcharge on top of the federal tax", () => {
    const result = calculateIpp(30_000, IPP_2026, 0.07);
    expect(result.communalTax).toBeCloseTo(result.federalTax * 0.07, 2);
    expect(result.totalTax).toBeCloseTo(result.federalTax * 1.07, 2);
  });
});

describe("applySocialContributions", () => {
  it("deducts the employee social contribution rate", () => {
    expect(applySocialContributions(1000, IPP_2026)).toBeCloseTo(869.3, 2);
  });
});
