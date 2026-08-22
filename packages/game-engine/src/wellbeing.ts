import {
  INDEPENDENT_ACTIVITY_MAX_WELLBEING_DRAIN_PER_CYCLE,
  MAX_COMFORT_BURNOUT_REDUCTION,
  MAX_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE,
  MAX_NUTRITION_DRAIN_REDUCTION,
  MAX_SOCIAL_BOOM_THRESHOLD_REDUCTION,
  MAX_SPORT_REGEN_BONUS,
  UNMANAGED_COMPANY_WELLBEING_DRAIN_PER_CYCLE,
} from "@patrimoine-jeu/domain";

/**
 * Bien-être — quatrième dimension du joueur (section 9bis du document de
 * conception) : fluctue en continu, contrairement à l'expérience qui ne
 * fait que croître. Volontairement lent à regagner et rapide à perdre sous
 * pression, à l'image de la fatigue/du burnout réels. Modulé par la section
 * bien-être personnelle (packages/domain/personal.ts) : chaque axe agit sur
 * une formule différente, comme les leviers d'entreprise agissent chacun sur
 * un aspect distinct de l'exploitation.
 */

/**
 * Régénération passive par cycle, indépendante de l'emploi (repos, vie hors
 * travail). Calibrée à l'origine pour un cycle hebdomadaire (1/cycle),
 * divisée par 7 pour un cycle quotidien afin de garder le même gain réel
 * par semaine.
 */
export const BASELINE_WELLBEING_REGEN = 1 / 7;

// Idem : facteur de drain calibré pour un cycle hebdomadaire, divisé par 7.
const PRESSURE_DRAIN_FACTOR = 0.15 / 7;
const MAX_TOLERANCE_REDUCTION = 0.6;
// Seuils "en cycles" multipliés par 7 pour garder la même durée réelle
// (cycle quotidien au lieu d'hebdomadaire).
const TOLERANCE_XP_FOR_MAX_REDUCTION = 700;

const RECONVERSION_BASE_PENALTY = 8;
const RECONVERSION_XP_CAP = 168;

const WELLBEING_BOOM_THRESHOLD = 70;
const WELLBEING_BURNOUT_THRESHOLD = 30;
const MAX_BOOM_BONUS = 0.1;
const MAX_BURNOUT_MALUS = 0.25;

export function clampStat(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Facteur [0.4, 1] par lequel l'expérience dans le secteur atténue le coût
 * en bien-être d'un poste — un vétéran encaisse un poste stressant qui
 * aurait cramé un débutant (section 9bis : le seuil de charge supportable
 * dépend de l'expérience).
 */
export function computeToleranceFactor(sectorCycles: number): number {
  const reduction = Math.min(
    MAX_TOLERANCE_REDUCTION,
    (sectorCycles / TOLERANCE_XP_FOR_MAX_REDUCTION) * MAX_TOLERANCE_REDUCTION,
  );
  return 1 - reduction;
}

/**
 * Coût en bien-être par cycle pour un poste de pression donnée, atténué par
 * la tolérance sectorielle et, indépendamment du secteur, par l'axe
 * personnel "Alimentation & sommeil" (jusqu'à -30% au niveau 100).
 */
export function computePressureDrain(pressure: number, sectorCycles: number, nutritionLevel = 0): number {
  const nutritionFactor = 1 - (nutritionLevel / 100) * MAX_NUTRITION_DRAIN_REDUCTION;
  return pressure * PRESSURE_DRAIN_FACTOR * computeToleranceFactor(sectorCycles) * nutritionFactor;
}

/** Régénération passive de bien-être par cycle, doublée au niveau 100 de l'axe personnel "Sport & santé". */
export function computeBaselineWellbeingRegen(sportLevel = 0): number {
  return BASELINE_WELLBEING_REGEN * (1 + (sportLevel / 100) * MAX_SPORT_REGEN_BONUS);
}

/**
 * Coût en bien-être de gérer soi-même ses entreprises actives, une par
 * entreprise SANS manager embauché (cf. domain/company.ts
 * UNMANAGED_COMPANY_WELLBEING_DRAIN_PER_CYCLE, section 12sexies) — un
 * manager embauché supprime ce coût pour son entreprise, la vraie
 * contrepartie du salaire versé.
 */
export function computeUnmanagedCompanyWellbeingDrain(unmanagedActiveCompanyCount: number): number {
  return unmanagedActiveCompanyCount * UNMANAGED_COMPANY_WELLBEING_DRAIN_PER_CYCLE;
}

/**
 * Coût en bien-être de l'activité d'indépendant complémentaire (cf.
 * domain/independent-activity.ts) — croissant avec le CARRÉ du revenu
 * déclaré, contrairement à la pression fixe d'un emploi : un petit à-côté
 * modeste ne coûte presque rien, mais s'approcher du plafond déclaratif
 * devient plus coûteux que n'importe quel emploi du jeu. C'est le vrai
 * garde-fou contre l'abus, pas seulement le plafond en euros.
 */
export function computeIndependentActivityWellbeingDrain(grossRevenuePerCycle: number): number {
  const ratio = grossRevenuePerCycle / MAX_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE;
  return INDEPENDENT_ACTIVITY_MAX_WELLBEING_DRAIN_PER_CYCLE * ratio * ratio;
}

/**
 * Coût ponctuel de reconversion en bien-être, appliqué au changement de
 * secteur (pas en restant dans le même secteur, ni sur le tout premier
 * emploi). Dégressif avec l'expérience déjà acquise dans le nouveau
 * secteur : reprendre un métier déjà connu ne coûte presque rien.
 */
export function computeReconversionPenalty(sectorCyclesInNewSector: number): number {
  const factor = Math.max(0, 1 - sectorCyclesInNewSector / RECONVERSION_XP_CAP);
  return RECONVERSION_BASE_PENALTY * factor;
}

/**
 * Multiplicateur appliqué aux revenus/résultats (section 9bis) : bonus
 * modeste et croissant en zone "épanoui", neutre en zone médiane, malus
 * croissant — et plus sévère que le bonus — en zone "burnout". L'axe
 * personnel "Vie sociale & loisirs" abaisse le seuil d'entrée en zone
 * "épanoui" (jusqu'à -20 points au niveau 100) ; l'axe "Confort de vie"
 * atténue le malus de burnout (jusqu'à -50% au niveau 100).
 */
export function computeWellbeingIncomeMultiplier(wellbeing: number, socialLevel = 0, comfortLevel = 0): number {
  const boomThreshold = WELLBEING_BOOM_THRESHOLD - (socialLevel / 100) * MAX_SOCIAL_BOOM_THRESHOLD_REDUCTION;
  if (wellbeing >= boomThreshold) {
    const progress = (wellbeing - boomThreshold) / (100 - boomThreshold);
    return 1 + progress * MAX_BOOM_BONUS;
  }
  if (wellbeing < WELLBEING_BURNOUT_THRESHOLD) {
    const effectiveMaxBurnoutMalus = MAX_BURNOUT_MALUS * (1 - (comfortLevel / 100) * MAX_COMFORT_BURNOUT_REDUCTION);
    const progress = (WELLBEING_BURNOUT_THRESHOLD - wellbeing) / WELLBEING_BURNOUT_THRESHOLD;
    return 1 - progress * effectiveMaxBurnoutMalus;
  }
  return 1;
}
