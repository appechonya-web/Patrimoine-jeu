/**
 * Profil immobilier propre à chaque province belge (cf. packages/db/prisma/seed.ts,
 * remplace l'ancien système où les 6 mêmes gabarits de bien étaient générés
 * identiquement partout, avec pour seule variation un multiplicateur de prix
 * par RÉGION — trop grossier pour distinguer, par exemple, le Brabant wallon
 * (aisé) du Hainaut (post-industriel), tous deux en Wallonie. `priceMultiplier`
 * remplace entièrement l'ancien multiplicateur régional (plus fin, il
 * l'englobe) ; `propertyCounts` fixe combien de biens de chaque type sont
 * générés au démarrage, reflétant le caractère économique réel de la
 * province plutôt qu'un même gabarit uniforme.
 */

export type ProvincePropertyType = "PARKING" | "APARTMENT" | "HOUSE" | "COMMERCIAL" | "LUXURY";

export interface ProvinceProfile {
  description: string;
  priceMultiplier: number;
  propertyCounts: Partial<Record<ProvincePropertyType, number>>;
}

export const PROVINCE_PROPERTY_PROFILES: Record<string, ProvinceProfile> = {
  Anvers: {
    description: "Port, diamant et industrie chimique",
    priceMultiplier: 1.15,
    propertyCounts: { PARKING: 2, APARTMENT: 3, HOUSE: 1, COMMERCIAL: 3, LUXURY: 1 },
  },
  "Brabant flamand": {
    description: "Banlieue aisée de Bruxelles et pôle biotech (Louvain)",
    priceMultiplier: 1.25,
    propertyCounts: { PARKING: 1, APARTMENT: 2, HOUSE: 3, COMMERCIAL: 1, LUXURY: 2 },
  },
  "Flandre-Occidentale": {
    description: "Côte touristique, agriculture et pêche",
    priceMultiplier: 1.05,
    propertyCounts: { PARKING: 1, APARTMENT: 3, HOUSE: 2, COMMERCIAL: 1, LUXURY: 1 },
  },
  "Flandre-Orientale": {
    description: "Port de Gand, textile et agriculture",
    priceMultiplier: 1.0,
    propertyCounts: { PARKING: 1, APARTMENT: 2, HOUSE: 2, COMMERCIAL: 2 },
  },
  Limbourg: {
    description: "Ancien bassin minier, agriculture fruitière et logistique",
    priceMultiplier: 0.85,
    propertyCounts: { PARKING: 1, APARTMENT: 1, HOUSE: 3, COMMERCIAL: 2 },
  },
  "Brabant wallon": {
    description: "Banlieue aisée et pôle pharma/biotech (Louvain-la-Neuve)",
    priceMultiplier: 1.3,
    propertyCounts: { PARKING: 1, APARTMENT: 1, HOUSE: 3, COMMERCIAL: 1, LUXURY: 3 },
  },
  Hainaut: {
    description: "Ancien bassin industriel (charbon, acier), reconversion en cours",
    priceMultiplier: 0.75,
    propertyCounts: { PARKING: 2, APARTMENT: 3, HOUSE: 2, COMMERCIAL: 2 },
  },
  Liège: {
    description: "Sidérurgie, métallurgie et pôle universitaire",
    priceMultiplier: 0.9,
    propertyCounts: { PARKING: 2, APARTMENT: 3, HOUSE: 1, COMMERCIAL: 3 },
  },
  Luxembourg: {
    description: "Forêts ardennaises, ruralité et tourisme vert",
    priceMultiplier: 0.8,
    propertyCounts: { APARTMENT: 1, HOUSE: 4, COMMERCIAL: 1, LUXURY: 1 },
  },
  Namur: {
    description: "Agriculture, tourisme et capitale administrative de la Wallonie",
    priceMultiplier: 0.95,
    propertyCounts: { PARKING: 1, APARTMENT: 2, HOUSE: 3, COMMERCIAL: 2 },
  },
  "Bruxelles-Capitale": {
    description: "Capitale, institutions européennes et quartier d'affaires",
    priceMultiplier: 1.4,
    propertyCounts: { PARKING: 1, APARTMENT: 3, COMMERCIAL: 3, LUXURY: 2 },
  },
};

/**
 * Spécialisation économique historique par province, pour les secteurs
 * réellement modelés dans le jeu (packages/db/prisma/seed.ts,
 * LEVEL_0_SECTORS/LEVEL_1_SECTORS) — pas de tech/port/finance, ces
 * secteurs-là n'existent pas encore côté entreprises. Une entreprise dont le
 * secteur figure dans la liste de SA province reçoit un bonus permanent
 * d'attractivité effective (cf. PROVINCE_SECTOR_AFFINITY_BONUS,
 * game-engine/cycles.ts) — même logique qu'un manager ou des
 * infrastructures communales : un avantage structurel, pas un aléa
 * temporaire comme les événements sectoriels. Certaines provinces
 * (Anvers, Brabant flamand/wallon, Bruxelles-Capitale) n'ont volontairement
 * aucune affinité : leur vraie spécialité (port, tech, finance, services)
 * ne correspond à aucun des sept secteurs du jeu.
 */
export const PROVINCE_SECTOR_AFFINITY_BONUS = 12;

export const PROVINCE_SECTOR_AFFINITIES: Record<string, string[]> = {
  Luxembourg: ["Bois", "Menuiserie"],
  Namur: ["Bois", "Menuiserie", "Extraction"],
  Liège: ["Métaux", "Métallurgie", "Extraction"],
  Hainaut: ["Métaux", "Métallurgie", "Extraction", "Agriculture"],
  "Flandre-Occidentale": ["Agriculture", "Textile brut"],
  "Flandre-Orientale": ["Textile brut"],
  Limbourg: ["Agriculture"],
};
