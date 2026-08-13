import { Prisma, PrismaClient } from "@prisma/client";
import { IPP_2026 } from "@patrimoine-jeu/fiscal-be";

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

async function main() {
  for (const region of REGIONS) {
    const createdRegion = await prisma.region.upsert({
      where: { name: region.name },
      create: { name: region.name },
      update: {},
    });

    for (const municipality of region.municipalities) {
      await prisma.municipality.upsert({
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
    }
  }

  for (const sectorName of LEVEL_0_SECTORS) {
    await prisma.sector.upsert({
      where: { name: sectorName },
      create: { name: sectorName, level: 0 },
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
      },
    });
  }

  // Joueur de test à ID fixe — pratique pour tester GET /players/me sans
  // devoir aller chercher un UUID généré dans les logs.
  const TEST_PLAYER_ID = "11111111-1111-1111-1111-111111111111";

  await prisma.player.upsert({
    where: { id: TEST_PLAYER_ID },
    create: {
      id: TEST_PLAYER_ID,
      email: "joueur.test@patrimoine-jeu.local",
      pseudo: "joueur_test",
      stats: {
        create: {},
      },
    },
    update: {},
  });
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
