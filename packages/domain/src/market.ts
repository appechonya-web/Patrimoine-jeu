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
 * Même rôle que CORE_MARKET_NPC_REFERENCE_OFFSET, mais côté compétitivité
 * totale plutôt que taille du marché : sans concurrent IA sur les gammes
 * hors "core", une entreprise seule sur sa gamme dans un secteur voit sa
 * compétitivité propre former TOUT le dénominateur de computeCapturedDemand
 * — le ratio devient mécaniquement 1 quel que soit son prix, rendant le
 * prix totalement indolore pour un pionnier isolé. On ajoute donc, comme
 * pour "core", une compétitivité de référence fixe et indépendante du
 * joueur : celle d'une entreprise hypothétique tarifée exactement au prix
 * de référence de la gamme, sans aucun levier (attractivité de référence,
 * marketing/qualité/branding/innovation à 0) — ce qui vaut exactement 1
 * (cf. computeCompetitiveness). Un pionnier isolé reste largement gagnant
 * s'il reste raisonnable, mais ne peut plus monter son prix à l'infini sans
 * qu'une part croissante de la demande s'échappe vers cette référence.
 */
export const NON_CORE_REFERENCE_COMPETITIVENESS = 1;

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

/**
 * Développement du marché par l'investissement marketing collectif —
 * jusqu'ici, seuls le nombre de joueurs et l'infrastructure communale
 * (POPULATION_DEMAND_SCALE ci-dessus) faisaient grossir la demande
 * nationale ; l'investissement d'UNE entreprise dans un (secteur, gamme)
 * donné ne changeait jamais que SA part du gâteau (cf.
 * computeCapturedDemand), jamais la taille du gâteau lui-même — un
 * plafond bien réel en petite partie (peu de concurrents, marché déjà
 * saturé à capacité de base).
 *
 * Ici, la somme des niveaux marketing de toutes les entreprises actives
 * sur un même (secteur, gamme) fait réellement grossir CE marché précis
 * — un effet de catégorie réaliste (une pub qui fait connaître un type de
 * produit profite à tout le vendeurs du secteur, pas seulement à qui l'a
 * payée), tout en gardant un avantage net à investir soi-même : la
 * compétitivité gagnée capte une part plus grande d'un gâteau qui, en
 * plus, est devenu plus gros. Même forme de rendements décroissants
 * (racine carrée) que le reste du jeu.
 */
export const MARKET_DEVELOPMENT_SCALE = 200;
/** Plafond du bonus multiplicatif sur la taille du marché (2 = jusqu'à ×3 la taille de base). */
export const MAX_MARKET_DEVELOPMENT_BONUS = 2;
