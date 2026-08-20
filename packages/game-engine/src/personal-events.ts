import { PERSONAL_LIFE_EVENTS, PERSONAL_LIFE_EVENT_PROBABILITY_PER_CYCLE } from "@patrimoine-jeu/domain";

/**
 * Événements de vie aléatoires — cf. domain/personal-events.ts pour le
 * catalogue et le calibrage. Tiré une fois par joueur et par cycle.
 */

export interface PersonalLifeEventResult {
  id: string;
  label: string;
  isPositive: boolean;
  wealthDelta: number;
  wellbeingDelta: number;
  reputationDelta: number;
}

export function rollPersonalLifeEvent(ownsVehicle: boolean): PersonalLifeEventResult | null {
  if (Math.random() > PERSONAL_LIFE_EVENT_PROBABILITY_PER_CYCLE) return null;

  const eligible = PERSONAL_LIFE_EVENTS.filter((event) => !event.requiresVehicle || ownsVehicle);
  const definition = eligible[Math.floor(Math.random() * eligible.length)];
  const wealthDelta = definition.minWealthDelta + Math.random() * (definition.maxWealthDelta - definition.minWealthDelta);

  return {
    id: definition.id,
    label: definition.label,
    isPositive: definition.isPositive,
    wealthDelta,
    wellbeingDelta: definition.wellbeingDelta,
    reputationDelta: definition.reputationDelta,
  };
}
