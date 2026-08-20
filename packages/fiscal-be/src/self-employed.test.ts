import { describe, expect, it } from "vitest";
import type { TaxBracket } from "./ipp.js";
import { calculateSelfEmployedContributions } from "./self-employed.js";

const BRACKETS: TaxBracket[] = [
  { upTo: 75_024.54, rate: 0.205 },
  { upTo: 110_562.42, rate: 0.1416 },
  { upTo: null, rate: 0 },
];

describe("calculateSelfEmployedContributions", () => {
  it("applies the first bracket rate below its ceiling", () => {
    expect(calculateSelfEmployedContributions(10_000, BRACKETS)).toBeCloseTo(2_050, 2);
  });

  it("taxes progressively across brackets", () => {
    const result = calculateSelfEmployedContributions(80_000, BRACKETS);
    // 75024.54 @20.5% = 15,380.03; remaining 4,975.46 @14.16% = 704.52
    expect(result).toBeCloseTo(75_024.54 * 0.205 + (80_000 - 75_024.54) * 0.1416, 1);
  });

  it("applies a 0% rate beyond the second bracket", () => {
    const belowCeiling = calculateSelfEmployedContributions(110_562.42, BRACKETS);
    const aboveCeiling = calculateSelfEmployedContributions(200_000, BRACKETS);
    expect(aboveCeiling).toBeCloseTo(belowCeiling, 2);
  });

  it("returns 0 for 0 revenue", () => {
    expect(calculateSelfEmployedContributions(0, BRACKETS)).toBe(0);
  });
});
