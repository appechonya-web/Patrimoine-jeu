import { z } from "zod";

/**
 * Cartel sectoriel (section 12quinquies du document de conception) : les
 * entreprises membres s'engagent à ne jamais vendre leur gamme "core" sous
 * un prix plancher commun — une entente sur les prix classique. Contrôlée
 * uniquement par la validation du prix (cf. companies.service.ts
 * setProductPrice), pas de bonus artificiel de compétitivité : l'intérêt
 * du cartel vient déjà du fait que les membres ne se dévalorisent plus
 * entre eux dans le marché partagé (cf. game-engine/companies.ts,
 * computeCapturedDemand) tout en vendant plus cher. Détection automatique
 * à chaque cycle (cf. game-engine/guild.ts), probabilité croissante avec
 * l'écart au prix de référence et le nombre de membres.
 */

export const GUILD_FOUNDING_COST = 2_000;

export const GUILD_BASE_DETECTION_RATE = 0.002;
export const GUILD_DETECTION_SENSITIVITY = 0.05;
export const GUILD_PER_MEMBER_DETECTION_INCREMENT = 0.01;
export const GUILD_MAX_DETECTION_PROBABILITY = 0.25;

export const GUILD_FINE_PER_MEMBER = 200;
export const GUILD_REPUTATION_PENALTY = 15;
/** Un membre d'un cartel démantelé ne peut pas en refonder/rejoindre un autre dans le même secteur avant ce délai. */
export const GUILD_REFORM_COOLDOWN_CYCLES = 180;

export const foundGuildInputSchema = z.object({
  name: z.string().min(2).max(64),
  companyId: z.string().uuid(),
  priceFloor: z.number().positive(),
});
export type FoundGuildInput = z.infer<typeof foundGuildInputSchema>;

export const joinGuildInputSchema = z.object({
  companyId: z.string().uuid(),
});
export type JoinGuildInput = z.infer<typeof joinGuildInputSchema>;

export const setGuildPriceFloorInputSchema = z.object({
  priceFloor: z.number().positive(),
});
export type SetGuildPriceFloorInput = z.infer<typeof setGuildPriceFloorInputSchema>;

/**
 * Espace de communication ouvert de guilde (cf. section 12quinquies) — un
 * fil de messages réservé aux membres actuels, pour l'info/coordination
 * (prix indicatifs, projets communaux collectifs) — distinct du mécanisme
 * de cartel (prix plancher/détection) ci-dessus, qui reste automatique et
 * ne dépend d'aucun message posté ici.
 */
export const MIN_GUILD_MESSAGE_LENGTH = 1;
export const MAX_GUILD_MESSAGE_LENGTH = 500;

export const postGuildMessageInputSchema = z.object({
  body: z.string().trim().min(MIN_GUILD_MESSAGE_LENGTH).max(MAX_GUILD_MESSAGE_LENGTH),
});
export type PostGuildMessageInput = z.infer<typeof postGuildMessageInputSchema>;
