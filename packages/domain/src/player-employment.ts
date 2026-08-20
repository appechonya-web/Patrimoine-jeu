import { z } from "zod";

/**
 * Employeur d'autres joueurs (cf. section 11 et 12quinquies du document de
 * conception) — le schéma Employment (employerType COMPANY, jobId null)
 * était déjà scaffoldé pour ce cas mais jamais alimenté : jusqu'ici seul
 * employerType SYSTEM_NPC (cf. employment.ts NPC_JOBS) était utilisé. Une
 * offre d'emploi COMPANY fonctionne comme une offre de prêt entre joueurs
 * (cf. domain/community-lending.ts) : n'importe quel actionnaire principal
 * peut en publier une, n'importe quel autre joueur peut la prendre — pas de
 * processus de candidature/sélection, le marché de l'emploi reste simple et
 * immédiat comme le catalogue NPC_JOBS existant.
 */

export const PLAYER_JOB_MIN_PRESSURE = 10;
export const PLAYER_JOB_MAX_PRESSURE = 90;

export const createJobPostingInputSchema = z.object({
  role: z.string().trim().min(2).max(60),
  /** Salaire PAR CYCLE (comme Employment.salary), pas annuel — l'employeur fixe librement le montant. */
  salary: z.number().positive(),
  pressure: z.number().int().min(PLAYER_JOB_MIN_PRESSURE).max(PLAYER_JOB_MAX_PRESSURE),
});
export type CreateJobPostingInput = z.infer<typeof createJobPostingInputSchema>;
