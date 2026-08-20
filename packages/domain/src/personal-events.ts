/**
 * Événements de vie aléatoires — le pendant personnel des aléas
 * d'entreprise (cf. company.ts EVENT_DEFINITIONS/rollCompanyEvent) : des
 * imprévus qui touchent le joueur directement, pas son entreprise.
 * Probabilité volontairement plus faible qu'un aléa d'entreprise (0,008 au
 * lieu de 0,0114) — un événement de vie doit rester un moment marquant, pas
 * une routine.
 */

export const PERSONAL_LIFE_EVENT_PROBABILITY_PER_CYCLE = 0.008;

export interface PersonalLifeEventDefinition {
  id: string;
  label: string;
  isPositive: boolean;
  minWealthDelta: number;
  maxWealthDelta: number;
  wellbeingDelta: number;
  reputationDelta: number;
  /** Ne peut être tiré que si le joueur possède un véhicule (cf. domain/personal-goods.ts). */
  requiresVehicle?: boolean;
}

export const PERSONAL_LIFE_EVENTS: PersonalLifeEventDefinition[] = [
  {
    id: "heritage",
    label: "Héritage inattendu",
    isPositive: true,
    minWealthDelta: 2_000,
    maxWealthDelta: 5_000,
    wellbeingDelta: -2,
    reputationDelta: 0,
  },
  {
    id: "prime-surprise",
    label: "Prime surprise",
    isPositive: true,
    minWealthDelta: 300,
    maxWealthDelta: 800,
    wellbeingDelta: 3,
    reputationDelta: 0,
  },
  {
    id: "gain-loterie",
    label: "Petit gain à la loterie",
    isPositive: true,
    minWealthDelta: 100,
    maxWealthDelta: 400,
    wellbeingDelta: 4,
    reputationDelta: 0,
  },
  {
    id: "rencontre-marquante",
    label: "Rencontre marquante",
    isPositive: true,
    minWealthDelta: 0,
    maxWealthDelta: 0,
    wellbeingDelta: 8,
    reputationDelta: 1,
  },
  {
    id: "reconciliation",
    label: "Réconciliation familiale",
    isPositive: true,
    minWealthDelta: 0,
    maxWealthDelta: 0,
    wellbeingDelta: 10,
    reputationDelta: 2,
  },
  {
    id: "probleme-sante",
    label: "Problème de santé",
    isPositive: false,
    minWealthDelta: -800,
    maxWealthDelta: -300,
    wellbeingDelta: -12,
    reputationDelta: 0,
  },
  {
    id: "accident-voiture",
    label: "Accident de voiture",
    isPositive: false,
    minWealthDelta: -1_500,
    maxWealthDelta: -500,
    wellbeingDelta: -5,
    reputationDelta: 0,
    requiresVehicle: true,
  },
  {
    id: "panne-imprevue",
    label: "Panne imprévue à la maison",
    isPositive: false,
    minWealthDelta: -600,
    maxWealthDelta: -200,
    wellbeingDelta: -3,
    reputationDelta: 0,
  },
  {
    id: "amende",
    label: "Amende administrative",
    isPositive: false,
    minWealthDelta: -400,
    maxWealthDelta: -100,
    wellbeingDelta: -2,
    reputationDelta: -1,
  },
  {
    id: "deuil-rupture",
    label: "Deuil ou rupture",
    isPositive: false,
    minWealthDelta: 0,
    maxWealthDelta: 0,
    wellbeingDelta: -18,
    reputationDelta: 0,
  },
  {
    id: "litige",
    label: "Litige / procès",
    isPositive: false,
    minWealthDelta: -2_000,
    maxWealthDelta: -500,
    wellbeingDelta: -4,
    reputationDelta: -3,
  },
];
