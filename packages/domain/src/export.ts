/**
 * Marchés internationaux — un déblocage unique et permanent (payé depuis la
 * trésorerie de l'entreprise, pas de cooldown) ouvre l'accès à un pool de
 * demande EXPORT, séparé du marché national partagé avec les concurrents
 * locaux (NPC compris) : seules les entreprises qui ont débloqué l'export
 * s'y disputent la demande (cf. game-engine/cycles.ts). Cette demande vient
 * s'AJOUTER à la demande nationale déjà captée, sur la MÊME capacité de
 * production déjà allouée — elle ne profite donc que si la capacité a de la
 * marge au-delà de ce que le marché national consomme déjà, une vraie
 * synergie avec l'expansion de capacité (cf. company.ts,
 * CAPACITY_EXPANSION_SCALE) plutôt qu'un simple bonus gratuit.
 */
export const EXPORT_UNLOCK_COST = 10_000;

/**
 * Taille de base du pool export (avant multiplicateur de gamme et
 * développement collectif, cf. game-engine/companies.ts
 * computeExportPoolSize) — volontairement plus modeste que le marché
 * national : un marché de niche pour les entreprises déjà bien installées,
 * pas un doublon du marché local.
 */
export const EXPORT_POOL_BASE_SIZE = 5;
