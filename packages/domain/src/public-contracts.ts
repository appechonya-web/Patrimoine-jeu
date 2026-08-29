/**
 * Contrats publics récurrents — nouveau revenu passif, sans action du
 * joueur, réservé aux entreprises suffisamment établies (attractivité
 * au-delà d'une base de départ + manager, cf. game-engine/companies.ts
 * BASE_ATTRACTIVENESS=30 + MANAGER_ATTRACTIVENESS_BONUS=10). Rendements
 * décroissants (racine carrée), même forme que le reste des formules du
 * jeu — un supplément mérité par une entreprise bien tenue, pas un levier
 * qu'on peut maximiser artificiellement.
 */
export const PUBLIC_CONTRACT_MIN_ATTRACTIVENESS = 40;
export const PUBLIC_CONTRACT_SCALE = 3;
