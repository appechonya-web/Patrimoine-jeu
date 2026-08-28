import { z } from "zod";

/** Nombre de cycles de jeu par an — un cycle correspond à un jour. */
export const CYCLES_PER_YEAR = 365;

export const JOB_IDS = [
  "ouvrier",
  "employe-bureau",
  "infirmier",
  "developpeur",
  "ingenieur",
  "cadre-commercial",
  "ouvrier-agricole",
  "consultant-senior",
  "directeur-technique",
  "cadre-dirigeant",
] as const;

export type JobId = (typeof JOB_IDS)[number];

export interface JobOffer {
  id: JobId;
  title: string;
  sector: string;
  annualGrossSalary: number;
  /** Pression du poste (0-100) — draine le bien-être à chaque cycle, cf. packages/game-engine/src/wellbeing.ts. */
  pressure: number;
  /**
   * Gain de réputation passif par cycle travaillé (utilité sociale du
   * métier) — 0 pour la plupart des postes. Valeurs pensées pour un rythme
   * hebdomadaire puis divisées par 7 (cycle quotidien) pour garder le même
   * gain réel par semaine.
   */
  reputationPerCycle: number;
  /**
   * Réputation minimale (PlayerStats.reputation, 0-100) requise pour
   * postuler — absent/undefined pour les postes de base, toujours ouverts.
   * Les postes de direction se méritent : on ne les débloque pas avec de
   * l'argent, seulement en s'étant bâti une réputation dans le jeu.
   */
  minReputation?: number;
}

/**
 * Catalogue d'emplois NPC (employerType SYSTEM_NPC) — pas encore lié à de
 * vraies entreprises joueur. Rémunération brute annuelle ; convertie en
 * salaire par cycle (/ CYCLES_PER_YEAR) au moment de l'embauche.
 *
 * pressure et reputationPerCycle sont volontairement non corrélés
 * linéairement au salaire : un poste modeste peut être plus reposant (ou
 * plus valorisant) qu'un poste bien payé, pour qu'il y ait un vrai choix
 * au-delà du seul montant du salaire.
 *
 * `sector` recoupe ici la chaîne de valeur d'entreprise (packages/db Sector,
 * section 8) uniquement quand le nom correspond exactement — c'est le cas
 * pour "Agriculture" (ouvrier-agricole), qui permet dès aujourd'hui de
 * vérifier le bonus d'XP sectorielle à la fondation d'une entreprise
 * niveau 0. Les autres métiers utilisent des secteurs "carrière" plus
 * larges (Industrie, Services, Santé, Technologie) qui ne correspondent pas
 * encore à un Sector d'entreprise seedé — le bonus sera 0 pour eux tant que
 * ces secteurs ne sont pas reliés (niveaux 1+ notamment).
 */
export const NPC_JOBS: Record<JobId, JobOffer> = {
  ouvrier: {
    id: "ouvrier",
    title: "Ouvrier de production",
    sector: "Industrie",
    annualGrossSalary: 28_000,
    pressure: 60,
    reputationPerCycle: 0,
  },
  "employe-bureau": {
    id: "employe-bureau",
    title: "Employé de bureau",
    sector: "Services",
    annualGrossSalary: 34_000,
    pressure: 25,
    reputationPerCycle: 0,
  },
  infirmier: {
    id: "infirmier",
    title: "Infirmier",
    sector: "Santé",
    annualGrossSalary: 42_000,
    pressure: 70,
    reputationPerCycle: 0.43,
  },
  developpeur: {
    id: "developpeur",
    title: "Développeur logiciel",
    sector: "Technologie",
    annualGrossSalary: 52_000,
    pressure: 45,
    reputationPerCycle: 0,
  },
  ingenieur: {
    id: "ingenieur",
    title: "Ingénieur",
    sector: "Industrie",
    annualGrossSalary: 58_000,
    pressure: 55,
    reputationPerCycle: 0,
  },
  "cadre-commercial": {
    id: "cadre-commercial",
    title: "Cadre commercial",
    sector: "Services",
    annualGrossSalary: 68_000,
    pressure: 85,
    reputationPerCycle: 0,
  },
  "ouvrier-agricole": {
    id: "ouvrier-agricole",
    title: "Ouvrier agricole",
    sector: "Agriculture",
    annualGrossSalary: 26_000,
    pressure: 50,
    reputationPerCycle: 0.14,
  },
  "consultant-senior": {
    id: "consultant-senior",
    title: "Consultant senior",
    sector: "Services",
    annualGrossSalary: 82_000,
    pressure: 75,
    reputationPerCycle: 0,
    minReputation: 60,
  },
  "directeur-technique": {
    id: "directeur-technique",
    title: "Directeur technique",
    sector: "Technologie",
    annualGrossSalary: 95_000,
    pressure: 65,
    reputationPerCycle: 0,
    minReputation: 65,
  },
  "cadre-dirigeant": {
    id: "cadre-dirigeant",
    title: "Cadre dirigeant",
    sector: "Industrie",
    annualGrossSalary: 110_000,
    pressure: 90,
    reputationPerCycle: 0,
    minReputation: 75,
  },
};

export const NPC_JOB_LIST: JobOffer[] = Object.values(NPC_JOBS);

export const takeJobInputSchema = z.object({
  jobId: z.enum(JOB_IDS),
});

export type TakeJobInput = z.infer<typeof takeJobInputSchema>;
