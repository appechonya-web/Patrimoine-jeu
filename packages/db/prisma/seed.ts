import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { IPP_2026 } from "@patrimoine-jeu/fiscal-be";
import { CASH_POOL_PER_PLAYER, COMMODITY_POOL_PER_PLAYER, FINANCIAL_ASSET_LIST } from "@patrimoine-jeu/domain";

const prisma = new PrismaClient();

/**
 * Jeu de communes de démarrage — un échantillon représentatif des 3 régions,
 * pas les ~580 communes belges. La couverture complète (section 7 du document
 * de conception) sera importée depuis une source officielle dans un script
 * séparé, pas saisie à la main ici.
 *
 * Taux d'additionnels communaux : valeurs approximatives à reconfirmer.
 * Droits d'enregistrement : taux standard par région (section 7). Pour
 * Bruxelles, l'abattement réel sur résidence principale est une déduction de
 * base taxable (jusqu'à ~25 000 € d'économie), pas un second taux fixe comme
 * en Flandre/Wallonie — approximé ici par le même taux que le standard en
 * attendant un modèle dédié.
 */
const REGIONS = [
  {
    name: "Flandre",
    registrationDutyRate: 0.12,
    registrationDutyRateOwnHome: 0.02,
    municipalities: [
      { name: "Anvers", additionalTaxRate: 0.08 },
      { name: "Gand", additionalTaxRate: 0.067 },
      { name: "Bruges", additionalTaxRate: 0.0685 },
    ],
  },
  {
    name: "Wallonie",
    registrationDutyRate: 0.125,
    registrationDutyRateOwnHome: 0.03,
    municipalities: [
      { name: "Liège", additionalTaxRate: 0.08 },
      { name: "Charleroi", additionalTaxRate: 0.09 },
      { name: "Namur", additionalTaxRate: 0.0755 },
    ],
  },
  {
    name: "Bruxelles-Capitale",
    registrationDutyRate: 0.125,
    registrationDutyRateOwnHome: 0.125,
    municipalities: [
      { name: "Bruxelles-Ville", additionalTaxRate: 0.07 },
      { name: "Ixelles", additionalTaxRate: 0.065 },
      { name: "Schaerbeek", additionalTaxRate: 0.0715 },
    ],
  },
];

/** Secteurs niveau 0 (matières premières) — section 8 du document de conception. */
const LEVEL_0_SECTORS = ["Bois", "Métaux", "Agriculture", "Textile brut", "Extraction"];

/**
 * Chaîne de valeur par paliers (section 8 du document de conception) —
 * premier palier de transformation, chacun rattaché à son secteur parent
 * de niveau 0 via SupplyContract. Volontairement restreint à deux secteurs
 * pour cette première tranche (pas les cinq d'un coup) : étoffer plus tard
 * est une pure question de données, comme les autres catalogues du jeu.
 */
const LEVEL_1_SECTORS: Array<{ name: string; parentSectorName: string }> = [
  { name: "Menuiserie", parentSectorName: "Bois" },
  { name: "Métallurgie", parentSectorName: "Métaux" },
];

/**
 * Immobilier — multiplicateur de prix par région, simple reflet de la
 * réalité belge (Bruxelles plus cher, Wallonie moins) plutôt qu'un indice
 * précis. Un vrai écart de gamme, du parking accessible dès les premiers
 * cycles jusqu'au bien de luxe hors de portée sans des années de jeu — le
 * rendement locatif (% de la valeur perçu en loyer par cycle) décroît avec
 * la gamme : les biens d'entrée de gamme rapportent proportionnellement
 * plus, le luxe est surtout un objectif de prestige à long terme.
 */
const REGION_PROPERTY_PRICE_MULTIPLIER: Record<string, number> = {
  Flandre: 1.1,
  Wallonie: 0.9,
  "Bruxelles-Capitale": 1.3,
};

interface PropertyTemplate {
  type: "PARKING" | "APARTMENT" | "HOUSE" | "COMMERCIAL" | "LUXURY";
  minValue: number;
  maxValue: number;
  rentYieldPerCycle: number;
}

const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  { type: "PARKING", minValue: 300, maxValue: 900, rentYieldPerCycle: 0.012 },
  { type: "APARTMENT", minValue: 3_000, maxValue: 12_000, rentYieldPerCycle: 0.0055 },
  { type: "APARTMENT", minValue: 3_000, maxValue: 12_000, rentYieldPerCycle: 0.0055 },
  { type: "HOUSE", minValue: 15_000, maxValue: 50_000, rentYieldPerCycle: 0.0045 },
  { type: "COMMERCIAL", minValue: 10_000, maxValue: 35_000, rentYieldPerCycle: 0.006 },
  { type: "LUXURY", minValue: 200_000, maxValue: 2_000_000, rentYieldPerCycle: 0.0025 },
];

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

async function main() {
  const createdMunicipalities: { id: string; name: string; regionName: string }[] = [];

  for (const region of REGIONS) {
    const createdRegion = await prisma.region.upsert({
      where: { name: region.name },
      create: { name: region.name },
      update: {},
    });

    for (const municipality of region.municipalities) {
      const createdMunicipality = await prisma.municipality.upsert({
        where: { regionId_name: { regionId: createdRegion.id, name: municipality.name } },
        create: {
          regionId: createdRegion.id,
          name: municipality.name,
          additionalTaxRate: municipality.additionalTaxRate,
          registrationDutyRate: region.registrationDutyRate,
          registrationDutyRateOwnHome: region.registrationDutyRateOwnHome,
        },
        update: {},
      });
      createdMunicipalities.push({ id: createdMunicipality.id, name: createdMunicipality.name, regionName: region.name });
    }
  }

  // Biens immobiliers — pas de contrainte unique naturelle sur Property,
  // on ne seed qu'une fois (table vide) plutôt que d'upsert un par un.
  const existingPropertyCount = await prisma.property.count();
  if (existingPropertyCount === 0) {
    for (const municipality of createdMunicipalities) {
      const priceMultiplier = REGION_PROPERTY_PRICE_MULTIPLIER[municipality.regionName] ?? 1;
      for (const template of PROPERTY_TEMPLATES) {
        const marketValue = Math.round(randomInRange(template.minValue, template.maxValue) * priceMultiplier);
        const baseRent = Math.round(marketValue * template.rentYieldPerCycle * 100) / 100;
        const property = await prisma.property.create({
          data: {
            municipalityId: municipality.id,
            type: template.type,
            marketValue,
            baseRent,
            status: "VACANT",
          },
        });
        await prisma.listing.create({
          data: {
            propertyId: property.id,
            price: property.marketValue,
            isAuction: false,
            expiresAt: new Date("2099-01-01"),
          },
        });
      }
    }
  }

  for (const sectorName of LEVEL_0_SECTORS) {
    const sector = await prisma.sector.upsert({
      where: { name: sectorName },
      create: { name: sectorName, level: 0 },
      update: {},
    });

    // Concurrents IA statiques : un plancher de concurrence réaliste dans
    // chaque secteur, même quand peu de joueurs y sont présents (cf.
    // domain/market.ts). Trois profils génériques par secteur — faible,
    // moyen, fort — pas de simulation IA complexe pour ce MVP.
    const competitors = [
      { name: `${sectorName} Artisanal`, competitiveness: 0.6 },
      { name: `${sectorName} Coopérative`, competitiveness: 1.0 },
      { name: `${sectorName} Groupe International`, competitiveness: 1.4 },
    ];
    for (const competitor of competitors) {
      await prisma.sectorCompetitor.upsert({
        where: { sectorId_name: { sectorId: sector.id, name: competitor.name } },
        create: { sectorId: sector.id, name: competitor.name, competitiveness: competitor.competitiveness },
        update: { competitiveness: competitor.competitiveness },
      });
    }

    // Bourse des matières premières : un pool par secteur, profondeur
    // minimale (1 joueur de référence) au seed — cf. domain/commodity.ts.
    // Se creuse ensuite tout seul à chaque clôture de cycle en fonction du
    // nombre de joueurs réel (cf. game-engine/commodities.ts).
    const existingMarket = await prisma.commodityMarket.findUnique({ where: { sectorId: sector.id } });
    if (!existingMarket) {
      await prisma.commodityMarket.create({
        data: {
          sectorId: sector.id,
          commodityReserve: COMMODITY_POOL_PER_PLAYER,
          cashReserve: CASH_POOL_PER_PLAYER,
        },
      });
    }
  }

  for (const { name: sectorName, parentSectorName } of LEVEL_1_SECTORS) {
    const parentSector = await prisma.sector.findUnique({ where: { name: parentSectorName } });
    if (!parentSector) continue;

    const sector = await prisma.sector.upsert({
      where: { name: sectorName },
      create: { name: sectorName, level: 1, parentSectorId: parentSector.id },
      update: { parentSectorId: parentSector.id },
    });

    // Même plancher de concurrence IA que le niveau 0 (cf. ci-dessus) — pas
    // de bourse de matières premières pour un secteur de transformation :
    // ses intrants viennent des entreprises niveau 0 via SupplyContract,
    // pas d'un pool joueur négociable.
    const competitors = [
      { name: `${sectorName} Artisanal`, competitiveness: 0.6 },
      { name: `${sectorName} Coopérative`, competitiveness: 1.0 },
      { name: `${sectorName} Groupe International`, competitiveness: 1.4 },
    ];
    for (const competitor of competitors) {
      await prisma.sectorCompetitor.upsert({
        where: { sectorId_name: { sectorId: sector.id, name: competitor.name } },
        create: { sectorId: sector.id, name: competitor.name, competitiveness: competitor.competitiveness },
        update: { competitiveness: competitor.competitiveness },
      });
    }
  }

  for (const asset of FINANCIAL_ASSET_LIST) {
    await prisma.financialAsset.upsert({
      where: { key: asset.key },
      create: { key: asset.key, name: asset.name, type: asset.type, price: asset.startPrice, previousPrice: asset.startPrice },
      update: {},
    });
  }

  const hasRuleSet = await prisma.taxRuleSet.findFirst({
    where: { effectiveFrom: new Date(IPP_2026.effectiveFrom) },
  });

  if (!hasRuleSet) {
    await prisma.taxRuleSet.create({
      data: {
        effectiveFrom: new Date(IPP_2026.effectiveFrom),
        taxFreeAllowance: IPP_2026.taxFreeAllowance,
        ippBrackets: IPP_2026.brackets as unknown as Prisma.InputJsonValue,
        socialContributionRateEmployee: IPP_2026.socialContributionRate,
        // Cotisations sociales indépendant (section 7) — à reconfirmer.
        selfEmployedBrackets: [
          { upTo: 75_024.54, rate: 0.205 },
          { upTo: 110_562.42, rate: 0.1416 },
          { upTo: null, rate: 0 },
        ] as unknown as Prisma.InputJsonValue,
        selfEmployedMinimumQuarterly: 917.58,
        isocRate: 0.25,
        isocReducedRate: 0.2,
        isocReducedThreshold: 100_000,
        capitalGainsRate: 0.1,
        capitalGainsExemption: 10_000,
        // Épargne-pension : réduction d'impôt "système classique" (30%, plafond ~990€) — cf. domain/savings.ts.
        pensionSavingsTaxReductionRate: 0.3,
        pensionSavingsAnnualCap: 1_000,
      },
    });
  }

  // Joueur de test à ID fixe — pratique pour tester GET /players/me sans
  // devoir aller chercher un UUID généré dans les logs. Mot de passe en clair
  // volontairement simple : uniquement pour le dev local.
  const TEST_PLAYER_ID = "11111111-1111-1111-1111-111111111111";
  const TEST_PLAYER_PASSWORD = "test1234";

  await prisma.player.upsert({
    where: { id: TEST_PLAYER_ID },
    create: {
      id: TEST_PLAYER_ID,
      email: "joueur.test@patrimoine-jeu.local",
      pseudo: "joueur_test",
      passwordHash: await bcrypt.hash(TEST_PLAYER_PASSWORD, 10),
      stats: {
        create: {},
      },
    },
    update: {},
  });

  console.log(
    `Joueur de test : joueur.test@patrimoine-jeu.local / ${TEST_PLAYER_PASSWORD}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
