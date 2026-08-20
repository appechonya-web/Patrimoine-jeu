import { z } from "zod";

/**
 * Banques-joueurs (section 12octies du document de conception) : toute
 * entreprise peut accepter des dépôts d'un joueur, pas seulement prêter sa
 * propre trésorerie (cf. domain/community-lending.ts, déjà existant côté
 * prêt) — les dépôts alimentent directement Company.cashReserve, ce qui
 * augmente d'autant sa capacité de prêt réelle. Au-delà de la simple
 * contrainte de liquidité déjà en place (jamais prêter plus que
 * cashReserve), un vrai ratio de solvabilité limite l'encours total prêté à
 * un multiple des fonds propres RÉELS de la banque (pas seulement de sa
 * trésorerie) — une banque sous-capitalisée ne peut pas prêter massivement
 * sur la seule base des dépôts qu'elle reçoit, exactement le risque
 * qu'impose une vraie régulation bancaire. Une cote de fiabilité publique
 * (cf. computeBankReliabilityRating, game-engine/banking.ts) résume ce
 * ratio pour les déposants/emprunteurs potentiels avant de s'engager. En
 * cascade : si une vague de défauts d'emprunteurs érode les fonds propres
 * d'une banque au point de la rendre insolvable, elle fait faillite comme
 * n'importe quelle entreprise (même mécanisme que BANKRUPTCY_CUMULATIVE_LOSS_THRESHOLD,
 * cf. company.ts) — ses dépôts sont alors soldés au prorata de ce qui reste
 * en trésorerie, une vraie perte possible pour le déposant plutôt qu'un
 * simple retrait différé.
 */

export const MIN_DEPOSIT_AMOUNT = 20;
export const MIN_DEPOSIT_RATE = 0;
export const MAX_DEPOSIT_RATE = 0.15;

/** Encours total prêtable (offres + prêts actifs) plafonné à ce multiple des fonds propres — un vrai ratio de solvabilité, pas juste la liquidité. */
export const SOLVENCY_RATIO_CAP = 3;

/**
 * Seuil d'insolvabilité déclenchant une faillite bancaire en cascade — fonds
 * propres négatifs au-delà de ce multiple des dépôts détenus (pas un
 * montant absolu : une petite banque locale et une grosse ont des échelles
 * très différentes).
 */
export const BANK_INSOLVENCY_EQUITY_RATIO_THRESHOLD = -0.5;

export const depositInputSchema = z.object({
  amount: z.number().min(MIN_DEPOSIT_AMOUNT),
});
export type DepositInput = z.infer<typeof depositInputSchema>;

export const withdrawDepositInputSchema = z.object({
  amount: z.number().min(0.01).optional(),
});
export type WithdrawDepositInput = z.infer<typeof withdrawDepositInputSchema>;

export const setDepositRateInputSchema = z.object({
  rate: z.number().min(MIN_DEPOSIT_RATE).max(MAX_DEPOSIT_RATE),
});
export type SetDepositRateInput = z.infer<typeof setDepositRateInputSchema>;
