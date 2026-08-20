import { z } from "zod";
import { INVESTMENT_AXES, MAX_INVESTMENT_PER_CYCLE, MIN_INVESTMENT_AMOUNT } from "./company.js";

/**
 * Partenariat d'investissement / assemblée générale (cf. section
 * 12quinquies du document de conception) — propositions/contre-
 * propositions pour une décision stratégique, vote proportionnel aux parts
 * détenues (pas une voix par joueur). Contrairement à toutes les actions de
 * pilotage existantes (investir, changer la politique de distribution...),
 * réservées à l'actionnaire principal (cf. companies.service.ts
 * assertPrimaryOwner), une proposition APPROUVÉE s'applique même si
 * l'actionnaire principal a voté contre — c'est tout l'intérêt d'une
 * décision collective plutôt qu'unilatérale.
 *
 * Résolution dès qu'un camp franchit 50% des parts TOTALES de l'entreprise
 * (pas seulement des votes déjà exprimés) — un actionnaire majoritaire à
 * lui seul peut donc trancher instantanément, comme dans une vraie AG.
 * Sans majorité formée avant l'échéance, la proposition est rejetée par
 * défaut (statu quo).
 */

export const PROPOSAL_TYPES = ["SET_DISTRIBUTION_POLICY", "INVEST"] as const;
export type ProposalType = (typeof PROPOSAL_TYPES)[number];

export const PROPOSAL_VOTING_DURATION_CYCLES = 7;
/** Part des parts TOTALES (pas des votes exprimés) requise pour trancher un camp — une vraie majorité de capital. */
export const PROPOSAL_MAJORITY_THRESHOLD = 50;

export const createProposalInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SET_DISTRIBUTION_POLICY"), distributionPolicy: z.enum(["dividend", "reserve"]) }),
  z.object({
    type: z.literal("INVEST"),
    axis: z.enum(INVESTMENT_AXES),
    amount: z.number().min(MIN_INVESTMENT_AMOUNT).max(MAX_INVESTMENT_PER_CYCLE),
  }),
]);
export type CreateProposalInput = z.infer<typeof createProposalInputSchema>;

export const castVoteInputSchema = z.object({
  inFavor: z.boolean(),
});
export type CastVoteInput = z.infer<typeof castVoteInputSchema>;
