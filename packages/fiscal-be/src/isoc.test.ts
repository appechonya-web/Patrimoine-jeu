import { describe, expect, it } from "vitest";
import { calculateIsoc, type IsocRuleSet } from "./isoc.js";

const RULE_SET: IsocRuleSet = { isocRate: 0.25, isocReducedRate: 0.2, isocReducedThreshold: 100_000 };

describe("calculateIsoc", () => {
  it("applies the reduced rate entirely below the threshold", () => {
    expect(calculateIsoc(50_000, RULE_SET)).toBeCloseTo(10_000, 2);
  });

  it("applies the reduced rate up to the threshold, full rate above it", () => {
    const result = calculateIsoc(150_000, RULE_SET);
    // 100_000 @20% = 20_000; remaining 50_000 @25% = 12_500
    expect(result).toBeCloseTo(32_500, 2);
  });

  it("treats a loss as zero taxable profit", () => {
    expect(calculateIsoc(-5_000, RULE_SET)).toBe(0);
  });
});
