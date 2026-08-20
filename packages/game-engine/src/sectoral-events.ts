import {
  SECTORAL_EVENT_CORRELATION_MAGNITUDE_MIN_RATIO,
  SECTORAL_EVENT_CORRELATION_MAGNITUDE_RANGE_RATIO,
  SECTORAL_EVENT_CORRELATION_PROBABILITY,
  SECTORAL_EVENT_SCOPE_BY_TIER,
  SECTORAL_EVENT_TIER_DURATION_CYCLES,
  SECTORAL_EVENT_TIER_MAGNITUDE,
  SECTORAL_EVENT_TIER_PROBABILITY,
  SECTORAL_EVENT_TIER_WARNING_CYCLES,
  SECTORAL_EVENT_TIERS,
  type SectoralEventScope,
  type SectoralEventTier,
} from "@patrimoine-jeu/domain";

export interface SectoralEventRoll {
  tier: SectoralEventTier;
  scope: SectoralEventScope;
  regionId: string | null;
  primarySectorId: string;
  primaryMagnitude: number;
  correlatedSectorId: string | null;
  correlatedMagnitude: number | null;
  startCycle: number;
  endCycle: number;
  warningCycles: number;
}

/**
 * Un tirage par cycle au plus — les paliers sont vérifiés du plus rare au
 * plus fréquent (EXCEPTIONAL en premier) : si plusieurs se déclenchaient le
 * même cycle par coïncidence, le plus marquant l'emporte plutôt que
 * d'empiler des effets contradictoires.
 */
export function rollSectoralEvent(
  sectors: { id: string }[],
  regions: { id: string }[],
  currentCycle: number,
): SectoralEventRoll | null {
  if (sectors.length === 0) return null;

  for (let i = SECTORAL_EVENT_TIERS.length - 1; i >= 0; i--) {
    const tier = SECTORAL_EVENT_TIERS[i];
    if (Math.random() < SECTORAL_EVENT_TIER_PROBABILITY[tier]) {
      return buildSectoralEventRoll(tier, sectors, regions, currentCycle);
    }
  }
  return null;
}

function buildSectoralEventRoll(
  tier: SectoralEventTier,
  sectors: { id: string }[],
  regions: { id: string }[],
  currentCycle: number,
): SectoralEventRoll {
  const scope = SECTORAL_EVENT_SCOPE_BY_TIER[tier];
  const regionId =
    scope === "REGIONAL" && regions.length > 0 ? regions[Math.floor(Math.random() * regions.length)].id : null;

  const primarySector = sectors[Math.floor(Math.random() * sectors.length)];
  const magnitudeRange = SECTORAL_EVENT_TIER_MAGNITUDE[tier];
  const primaryDirection = Math.random() < 0.5 ? 1 : -1;
  const primaryMagnitude = primaryDirection * (magnitudeRange.min + Math.random() * magnitudeRange.range);

  let correlatedSectorId: string | null = null;
  let correlatedMagnitude: number | null = null;
  const remainingSectors = sectors.filter((s) => s.id !== primarySector.id);
  if (remainingSectors.length > 0 && Math.random() < SECTORAL_EVENT_CORRELATION_PROBABILITY) {
    const correlatedSector = remainingSectors[Math.floor(Math.random() * remainingSectors.length)];
    const correlatedDirection = Math.random() < 0.5 ? 1 : -1;
    const ratio =
      SECTORAL_EVENT_CORRELATION_MAGNITUDE_MIN_RATIO + Math.random() * SECTORAL_EVENT_CORRELATION_MAGNITUDE_RANGE_RATIO;
    correlatedSectorId = correlatedSector.id;
    correlatedMagnitude = correlatedDirection * Math.abs(primaryMagnitude) * ratio;
  }

  const warningCycles = SECTORAL_EVENT_TIER_WARNING_CYCLES[tier];
  const startCycle = currentCycle + warningCycles;
  const endCycle = startCycle + SECTORAL_EVENT_TIER_DURATION_CYCLES[tier];

  return {
    tier,
    scope,
    regionId,
    primarySectorId: primarySector.id,
    primaryMagnitude,
    correlatedSectorId,
    correlatedMagnitude,
    startCycle,
    endCycle,
    warningCycles,
  };
}

export interface ActiveSectoralEffect {
  scope: SectoralEventScope;
  regionId: string | null;
  primarySectorId: string;
  primaryMagnitude: number;
  correlatedSectorId: string | null;
  correlatedMagnitude: number | null;
}

/**
 * Multiplicateur composé de tous les effets sectoriels actifs touchant ce
 * secteur à cette portée (et, pour la portée RÉGIONALE, cette région) —
 * réutilisé à la fois pour le pool de marché national (cf. cycles.ts,
 * marketPools) et pour l'attractivité effective régionale d'une entreprise.
 */
export function computeSectoralDemandMultiplier(
  activeEffects: ActiveSectoralEffect[],
  sectorId: string,
  scope: SectoralEventScope,
  regionId: string | null,
): number {
  let multiplier = 1;
  for (const effect of activeEffects) {
    if (effect.scope !== scope) continue;
    if (scope === "REGIONAL" && effect.regionId !== regionId) continue;
    if (effect.primarySectorId === sectorId) {
      multiplier *= 1 + effect.primaryMagnitude;
    } else if (effect.correlatedSectorId === sectorId && effect.correlatedMagnitude !== null) {
      multiplier *= 1 + effect.correlatedMagnitude;
    }
  }
  return Math.max(0, multiplier);
}
