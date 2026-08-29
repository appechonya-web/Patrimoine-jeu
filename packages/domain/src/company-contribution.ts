import { z } from "zod";

/**
 * Apport personnel à la trésorerie d'entreprise — jusqu'ici, verser de
 * l'argent de son patrimoine liquide vers une entreprise passait
 * obligatoirement soit par les 10 leviers classiques (plafonnés à
 * MAX_INVESTMENT_PER_CYCLE et un cooldown, cf. company.ts), soit par une
 * levée de fonds (émet des parts, dilue), soit par un prêt (crée une
 * dette). Un simple apport en capital — sans contrepartie, sans plafond,
 * sans cooldown — n'existait pas : un joueur assis sur des millions ne
 * pouvait pas simplement les injecter dans sa propre entreprise pour lui
 * donner plus de marge de manœuvre immédiate.
 */
export const MIN_CASH_CONTRIBUTION = 50;

export const contributeCashToCompanyInputSchema = z.object({
  amount: z.number().min(MIN_CASH_CONTRIBUTION),
});
export type ContributeCashToCompanyInput = z.infer<typeof contributeCashToCompanyInputSchema>;
