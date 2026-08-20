/**
 * Dilution mécanique lors d'une levée de capital-risque (cf.
 * domain/venture-capital.ts) — chaque actionnaire existant conserve sa part
 * RELATIVE inchangée entre eux, mais voit sa part du gâteau total réduite
 * proportionnellement pour laisser place aux nouvelles parts émises.
 */
export function computeDilutedSharePercentage(currentPercentage: number, newSharePercentage: number): number {
  const dilutionFactor = (100 - newSharePercentage) / 100;
  return currentPercentage * dilutionFactor;
}
