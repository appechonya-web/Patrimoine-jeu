import { z } from "zod";
import { INVESTMENT_AXES, MAX_INVESTMENT_PER_CYCLE } from "./company.js";

/**
 * Règles par défaut configurables (cf. section 12sexies du document de
 * conception) — parmi les trois exemples cités, seul le plafond de
 * réinvestissement automatique des bénéfices a un vrai déclencheur dans
 * les mécaniques déjà en place : ni le "renouvellement de bail au prix du
 * marché" (les baux n'ont pas de durée/échéance dans ce moteur — cf.
 * db Lease, un bail reste actif jusqu'à résiliation manuelle) ni le "refus
 * automatique des invitations à une entente suspecte" (rejoindre un
 * cartel est toujours une action explicite de l'actionnaire principal,
 * cf. guilds.service.ts join — il n'existe pas d'invitation reçue
 * passivement) n'ont d'événement à intercepter aujourd'hui. Les construire
 * aurait exigé d'inventer ces mécaniques de zéro, hors du périmètre d'un
 * simple réglage par défaut.
 */
export const setAutoReinvestRuleInputSchema = z.object({
  /** null désactive la règle. */
  axis: z.enum(INVESTMENT_AXES).nullable(),
  capPerCycle: z.number().min(0).max(MAX_INVESTMENT_PER_CYCLE),
});
export type SetAutoReinvestRuleInput = z.infer<typeof setAutoReinvestRuleInputSchema>;
