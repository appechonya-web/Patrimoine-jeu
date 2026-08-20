import { z } from "zod";
import { EMPLOYEE_TIERS } from "./company.js";

/**
 * Organisation & RH — l'entreprise n'a plus un seul dirigeant général
 * indivis (cf. hasManager/MANAGER_SALARY_PER_CYCLE, qui reste tel quel :
 * une couche de direction générale distincte) : chaque département peut EN
 * PLUS avoir son propre responsable, et les employés y sont assignés
 * plutôt que comptés globalement. Chaque département a son propre moral
 * d'équipe, vivant (dérive vers une base influencée par le levier
 * "conditions de travail", secoué par un peu d'aléa), qui pilote
 * l'efficacité des employés qui y travaillent — cf.
 * packages/game-engine/src/companies.ts, computeDepartmentEfficiency.
 * La "formation/carrière" demandée est déjà couverte par le levier
 * d'investissement "training" existant (booste la capacité de chaque
 * employé déjà en poste) — pas de système parallèle réinventé ici.
 */
export const DEPARTMENTS = ["sales", "rd", "production", "hr"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export interface DepartmentDefinition {
  id: Department;
  label: string;
}

export const DEPARTMENT_CATALOG: Record<Department, DepartmentDefinition> = {
  sales: { id: "sales", label: "Ventes" },
  rd: { id: "rd", label: "R&D" },
  production: { id: "production", label: "Production" },
  hr: { id: "hr", label: "RH" },
};

/**
 * Moins cher par tête que le dirigeant général (MANAGER_SALARY_PER_CYCLE) —
 * un responsable de département a un périmètre plus restreint — mais avec
 * 4 départements, une structure managériale complète coûte plus cher au
 * total qu'un seul dirigeant : une vraie croissance organisationnelle a un
 * coût.
 */
export const DEPARTMENT_MANAGER_SALARY_PER_CYCLE = 15;

export const DEFAULT_DEPARTMENT_MORALE = 50;

/**
 * Le moral d'un département dérive vers cette base (30-70 selon le levier
 * "conditions de travail"), amputée si le département n'a pas de
 * responsable dédié — personne pour porter les problèmes d'équipe.
 */
export const MORALE_BASELINE_MIN = 30;
export const MORALE_BASELINE_MAX = 70;
export const MORALE_UNMANAGED_PENALTY = 15;

/** Vitesse à laquelle le moral dérive vers sa base à chaque cycle. */
export const MORALE_DRIFT_RATE = 0.05;
/** Amplitude de l'aléa quotidien qui secoue le moral autour de sa trajectoire — un peu de vie, pas une formule figée. */
export const MORALE_RANDOM_WALK_RANGE = 2;

export const hireEmployeeInputSchema = z.object({
  tier: z.enum(EMPLOYEE_TIERS),
  department: z.enum(DEPARTMENTS),
});
export type HireEmployeeInput = z.infer<typeof hireEmployeeInputSchema>;
