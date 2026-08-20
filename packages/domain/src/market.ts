/**
 * Concurrence sectorielle : les entreprises (joueurs et concurrents IA) ne
 * puisent plus dans une demande infinie et indépendante — elles se
 * partagent une même "part du gâteau" par (secteur, gamme de produit),
 * proportionnellement à leur compétitivité relative (cf.
 * packages/game-engine/src/companies.ts : computeCompetitiveness pour la
 * force relative d'une entreprise, computeMarketPoolSize pour la taille du
 * gâteau, computeCapturedDemand pour la part qui en revient à chacune).
 * Rend le marketing et le branding réellement compétitifs : gagner en
 * compétitivité ne vaut que relativement aux rivaux du même marché, pas
 * dans l'absolu — et un secteur saturé de concurrents rapporte moins à
 * chacun, même à compétitivité égale.
 */

/**
 * Référence utilisée pour calibrer la taille du marché "core" (gamme de
 * fondation, la seule où opèrent les concurrents IA — cf. SectorCompetitor) :
 * en plus de leur compétitivité cumulée réelle dans un secteur donné, on
 * ajoute l'équivalent d'une entreprise joueur de force de référence — pour
 * qu'une toute première entreprise dans un secteur sans concurrent IA ne se
 * retrouve pas seule face à une demande infinie.
 */
export const CORE_MARKET_NPC_REFERENCE_OFFSET = 1;

/**
 * Les gammes hors "core" (économique/premium/innovant) n'ont pas de
 * concurrents IA : les IA ne font pas de R&D, elles ne lancent jamais ces
 * gammes. Leur marché de référence correspond à une seule entreprise joueur
 * de force de référence — un pionnier isolé sur une gamme en profite
 * pleinement, plusieurs joueurs qui s'y lancent en même temps se la
 * partagent réellement (au risque de se cannibaliser).
 */
export const NON_CORE_MARKET_REFERENCE_SIZE = 1;

/**
 * Croissance de la demande avec la taille de l'économie simulée — sans ça,
 * la taille du marché reste une constante figée quel que soit le nombre de
 * joueurs actifs, ce qui transforme le jeu en pur jeu à somme nulle par
 * secteur (plus de concurrents = mécaniquement moins pour chacun, jamais
 * plus de gâteau à partager). Deux leviers alimentent le même indice
 * d'activité économique, avec les mêmes rendements décroissants (racine
 * carrée) que les autres progressions du jeu : le nombre de joueurs inscrits
 * (plus de joueurs = plus de "consommateurs" dans l'économie simulée), et
 * l'investissement communal cumulé en infrastructure — investir
 * collectivement dans les communes fait donc, en plus du bonus
 * d'attractivité individuel déjà existant (cf. municipality.ts), réellement
 * grossir la demande nationale, pas juste la part que chacun en capte.
 */
export const POPULATION_DEMAND_SCALE = 10;

/** € de fonds d'infrastructure cumulés (toutes communes confondues) équivalents à un joueur inscrit de plus, dans l'indice d'activité économique. */
export const INFRASTRUCTURE_ECONOMIC_ACTIVITY_CONVERSION = 1_000;
