import { z } from "zod";

/**
 * Quiz éclair — une question vrai/faux sur une notion fiscale déjà
 * rencontrée dans le jeu, avec explication systématique (bonne ou mauvaise
 * réponse) : l'objectif est la mémorisation, pas juste le petit gain.
 * Catalogue volontairement restreint au départ, couvrant ce qui est déjà
 * implémenté — l'étoffer plus tard est une pure question de données (comme
 * GIG_CATALOG/ACHIEVEMENT_CATALOG), jamais de code à retoucher.
 */

export const QUIZ_COOLDOWN_SECONDS = 180;
export const QUIZ_CORRECT_REWARD = 8;

export const answerQuizInputSchema = z.object({ answer: z.boolean() });
export type AnswerQuizInput = z.infer<typeof answerQuizInputSchema>;

export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  correctAnswer: boolean;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "ipp-tranches",
    topic: "IPP",
    prompt: "Tout ton revenu imposable est taxé au même taux, celui de ta tranche la plus haute.",
    correctAnswer: false,
    explanation:
      "Faux — l'impôt est progressif par tranches : seule la portion de revenu qui dépasse un palier est taxée au taux supérieur, pas la totalité.",
  },
  {
    id: "ipp-franchise",
    topic: "IPP",
    prompt: "La quotité exemptée d'impôt réduit le montant sur lequel l'impôt est calculé, pas l'impôt lui-même.",
    correctAnswer: true,
    explanation: "Vrai — c'est une déduction de la base imposable, appliquée avant le calcul des tranches.",
  },
  {
    id: "isoc-taux-reduit",
    topic: "ISOC",
    prompt: "Une entreprise dont le profit reste sous un certain seuil bénéficie d'un taux d'ISOC réduit.",
    correctAnswer: true,
    explanation: "Vrai — un taux réduit s'applique en dessous du seuil, le taux plein au-delà.",
  },
  {
    id: "epargne-franchise",
    topic: "Épargne",
    prompt: "Les intérêts d'un livret d'épargne sont toujours taxés, quel que soit le montant perçu.",
    correctAnswer: false,
    explanation: "Faux — une franchise s'applique en premier : seuls les intérêts qui la dépassent sont taxés.",
  },
  {
    id: "pension-avantage",
    topic: "Épargne-pension",
    prompt: "L'épargne-pension ne donne droit qu'à des intérêts exonérés, sans autre avantage fiscal.",
    correctAnswer: false,
    explanation:
      "Faux — un versement donne aussi droit à une réduction d'impôt immédiate, en plus de l'exonération des intérêts.",
  },
  {
    id: "pension-plafond",
    topic: "Épargne-pension",
    prompt: "Le montant déductible en épargne-pension est plafonné chaque année.",
    correctAnswer: true,
    explanation: "Vrai — au-delà du plafond, le versement supplémentaire ne donne plus droit à la réduction d'impôt.",
  },
  {
    id: "pension-retrait",
    topic: "Épargne-pension",
    prompt: "Retirer son épargne-pension avant l'échéance entraîne une pénalité.",
    correctAnswer: true,
    explanation: "Vrai — un retrait anticipé coûte à la fois les intérêts courus et une pénalité en capital.",
  },
  {
    id: "reserve-liquidation",
    topic: "Dividendes",
    prompt:
      "La réserve de liquidation permet, après un délai de blocage, de sortir les bénéfices avec une taxation totale plus faible qu'un dividende classique.",
    correctAnswer: true,
    explanation: "Vrai — c'est tout l'intérêt du dispositif, en échange d'un blocage de plusieurs années.",
  },
  {
    id: "dividende-perte",
    topic: "Dividendes",
    prompt: "Quand une entreprise fait une perte, les actionnaires n'en supportent rien, quelle que soit la politique de distribution.",
    correctAnswer: false,
    explanation: "Faux — une perte passe toujours directement aux actionnaires, que la politique soit dividende ou réserve de liquidation.",
  },
  {
    id: "droits-enregistrement-auto",
    topic: "Immobilier",
    prompt: "Le taux réduit des droits d'enregistrement s'applique automatiquement à tout le monde.",
    correctAnswer: false,
    explanation: "Faux — il ne s'applique que si c'est ta première propriété résidentielle.",
  },
  {
    id: "droits-enregistrement-ajout",
    topic: "Immobilier",
    prompt: "Les droits d'enregistrement s'ajoutent au prix d'achat, l'acheteur doit prévoir ce montant en plus.",
    correctAnswer: true,
    explanation: "Vrai — c'est un coût additionnel à charge de l'acheteur, le vendeur ne reçoit que le prix affiché.",
  },
  {
    id: "independant-forfait",
    topic: "Indépendant",
    prompt: "Un indépendant à titre complémentaire paie le même forfait minimum de cotisations qu'un indépendant à titre principal, même sans revenu.",
    correctAnswer: false,
    explanation: "Faux — à titre complémentaire, les cotisations restent proportionnelles au revenu réel, sans forfait minimum.",
  },
  {
    id: "independant-taux-fixe",
    topic: "Indépendant",
    prompt: "Un revenu d'activité complémentaire est taxé à un taux fixe, séparé de ton salaire.",
    correctAnswer: false,
    explanation:
      "Faux — il s'ajoute à ton revenu total et suit le même barème progressif, ce qui peut le pousser vers une tranche marginale plus élevée.",
  },
  {
    id: "epargne-franchise-annuelle",
    topic: "Épargne",
    prompt: "La franchise sur les plus-values d'épargne se remet à zéro chaque année.",
    correctAnswer: false,
    explanation: "Faux — dans ce jeu, c'est une franchise à vie, pas une remise à zéro annuelle.",
  },
  {
    id: "salaire-cotisations-sociales",
    topic: "Salaire",
    prompt: "Les cotisations sociales sont prélevées sur ton salaire brut avant même le calcul de l'impôt.",
    correctAnswer: true,
    explanation:
      "Vrai — le revenu net imposable est d'abord réduit des cotisations sociales, puis l'impôt progressif s'applique sur ce qui reste.",
  },
  {
    id: "salaire-pression-bien-etre",
    topic: "Emploi",
    prompt: "Un poste à forte pression n'a aucun impact sur ton revenu net, seulement sur ton bien-être.",
    correctAnswer: false,
    explanation:
      "Faux — un bien-être trop bas déclenche un malus direct sur ton revenu net (jusqu'à -25%), la pression a donc un vrai coût financier indirect.",
  },
  {
    id: "emploi-reconversion",
    topic: "Emploi",
    prompt: "Changer de secteur d'activité n'a aucune conséquence si tu avais déjà de l'expérience dans l'ancien secteur.",
    correctAnswer: false,
    explanation:
      "Faux — la pénalité de reconversion dépend de ton expérience dans le NOUVEAU secteur, pas l'ancien : changer pour un secteur totalement nouveau coûte toujours une pénalité de bien-être.",
  },
  {
    id: "emploi-joueur-risque",
    topic: "Emploi",
    prompt: "Travailler pour l'entreprise d'un autre joueur est aussi sûr qu'un emploi classique.",
    correctAnswer: false,
    explanation:
      "Faux — ton salaire dépend de la trésorerie réelle de l'entreprise ; si elle ne peut plus payer, tu es licencié d'un coup, contrairement à un emploi classique toujours garanti.",
  },
  {
    id: "banque-ratio-solvabilite",
    topic: "Banque",
    prompt: "Une banque-joueur peut prêter autant qu'elle veut tant qu'elle a la trésorerie disponible.",
    correctAnswer: false,
    explanation:
      "Faux — un ratio de solvabilité plafonne l'encours total prêté à un multiple de ses fonds propres, pas seulement de sa trésorerie.",
  },
  {
    id: "banque-depot-garantie",
    topic: "Banque",
    prompt: "Un dépôt chez une entreprise-banque est garanti à 100%, comme dans une vraie banque.",
    correctAnswer: false,
    explanation:
      "Faux — il n'existe aucun fonds de garantie ici : en cas de faillite de la banque, le dépôt n'est remboursé qu'au prorata de ce qu'il reste en caisse.",
  },
  {
    id: "banque-fiabilite",
    topic: "Banque",
    prompt: "La cote de fiabilité d'une banque-joueur baisse quand son encours prêté approche son plafond de solvabilité.",
    correctAnswer: true,
    explanation:
      "Vrai — plus l'encours prêté se rapproche du plafond autorisé par les fonds propres, plus la cote de fiabilité chute.",
  },
  {
    id: "pret-taux-risque",
    topic: "Prêts",
    prompt: "Le taux d'un prêt bancaire d'entreprise dépend du ratio dette/fonds propres au moment de l'emprunt.",
    correctAnswer: true,
    explanation: "Vrai — plus une entreprise est déjà endettée par rapport à ses fonds propres, plus le taux proposé est élevé.",
  },
  {
    id: "pret-entre-joueurs",
    topic: "Prêts",
    prompt: "Un prêt entre joueurs a toujours un taux plus bas qu'un prêt bancaire classique.",
    correctAnswer: false,
    explanation:
      "Faux — un prêteur individuel fixe librement son taux, souvent plus élevé qu'un prêt institutionnel pour compenser l'absence de garanties.",
  },
  {
    id: "hypotheque-apport",
    topic: "Immobilier",
    prompt: "Une hypothèque peut couvrir 100% du prix d'un bien, sans apport personnel.",
    correctAnswer: false,
    explanation:
      "Faux — le prêt est plafonné à un pourcentage de la valeur du bien, le reste doit venir d'un apport personnel.",
  },
  {
    id: "hypotheque-defaut",
    topic: "Immobilier",
    prompt: "En cas de défaut de paiement d'une hypothèque, le bien est saisi et revendu en dessous de sa valeur de marché.",
    correctAnswer: true,
    explanation: "Vrai — une vente forcée se fait à un prix réduit par rapport à la valeur de marché, en plus d'une pénalité de réputation.",
  },
  {
    id: "assurance-concentration",
    topic: "Assurance",
    prompt: "Un assureur-joueur peut toujours indemniser tous ses assurés, même si plusieurs sinistres tombent le même cycle.",
    correctAnswer: false,
    explanation:
      "Faux — contrairement à l'assureur système toujours solvable, un assureur-joueur peut manquer de trésorerie si plusieurs sinistres arrivent en même temps.",
  },
  {
    id: "assurance-plafond",
    topic: "Assurance",
    prompt: "Une police d'assurance rembourse l'intégralité de n'importe quelle perte, sans plafond.",
    correctAnswer: false,
    explanation: "Faux — chaque police a un plafond de couverture par sinistre, au-delà duquel la perte reste à ta charge.",
  },
  {
    id: "capital-risque-dilution",
    topic: "Capital-risque",
    prompt: "Lever des fonds en capital-risque dilue tous les actionnaires existants, y compris le fondateur.",
    correctAnswer: true,
    explanation:
      "Vrai — de nouvelles parts sont émises pour l'investisseur, ce qui réduit mécaniquement le pourcentage de chaque actionnaire existant.",
  },
  {
    id: "capital-risque-argent",
    topic: "Capital-risque",
    prompt: "L'argent levé en capital-risque va directement dans la poche du fondateur.",
    correctAnswer: false,
    explanation: "Faux — l'argent entre dans la trésorerie de l'ENTREPRISE, pas dans le patrimoine personnel du fondateur.",
  },
  {
    id: "opa-actionnaires",
    topic: "OPA",
    prompt: "Une offre publique d'achat ne s'adresse qu'à l'actionnaire principal.",
    correctAnswer: false,
    explanation: "Faux — l'offre est ouverte à TOUS les actionnaires, y compris ceux qui n'avaient pas prévu de vendre.",
  },
  {
    id: "opa-prime",
    topic: "OPA",
    prompt: "Une OPA doit proposer un prix au moins égal à la valeur comptable de l'entreprise.",
    correctAnswer: true,
    explanation: "Vrai — une prime minimale au-dessus de la valeur comptable est exigée pour qu'une OPA soit valable.",
  },
  {
    id: "gouvernance-vote",
    topic: "Gouvernance",
    prompt: "Dans une assemblée générale d'entreprise, chaque actionnaire dispose d'une voix, peu importe le nombre de parts détenues.",
    correctAnswer: false,
    explanation: "Faux — le vote est pondéré par les parts détenues, pas une voix par personne : un gros actionnaire pèse plus qu'un petit.",
  },
  {
    id: "gouvernance-majorite",
    topic: "Gouvernance",
    prompt: "Une proposition d'actionnaires peut s'appliquer même sans l'accord de l'actionnaire principal.",
    correctAnswer: true,
    explanation:
      "Vrai — dès qu'un camp dépasse 50% des parts totales, la décision s'applique, même si l'actionnaire principal est minoritaire dans ce vote.",
  },
  {
    id: "cartel-detection",
    topic: "Cartels",
    prompt: "Un cartel de prix a plus de risques d'être détecté s'il compte beaucoup de membres.",
    correctAnswer: true,
    explanation: "Vrai — la probabilité de détection augmente avec le nombre de membres et l'écart au prix de référence du marché.",
  },
  {
    id: "cartel-sanction",
    topic: "Cartels",
    prompt: "Un cartel démantelé n'entraîne aucune sanction financière, seulement une perte de réputation.",
    correctAnswer: false,
    explanation: "Faux — chaque entreprise membre paie une amende en plus de la perte de réputation de son propriétaire.",
  },
  {
    id: "commune-bien-public",
    topic: "Communes",
    prompt: "Le bonus d'attractivité d'un fonds d'infrastructure communal ne profite qu'aux entreprises qui ont contribué.",
    correctAnswer: false,
    explanation: "Faux — c'est un bénéfice PARTAGÉ par toutes les entreprises de la commune, contributrices ou non.",
  },
  {
    id: "commune-vote",
    topic: "Communes",
    prompt: "Au conseil communal, le poids de vote dépend de ta contribution cumulée au fonds d'infrastructure.",
    correctAnswer: true,
    explanation: "Vrai — plus tu as contribué à cette commune, plus ton vote pèse dans les décisions du conseil.",
  },
  {
    id: "bourse-amm",
    topic: "Bourse",
    prompt: "Sur la bourse de matières premières, le prix est fixé par le jeu, pas par les transactions des joueurs.",
    correctAnswer: false,
    explanation:
      "Faux — c'est un marché automatisé : le prix bouge mécaniquement selon l'offre et la demande réelles des joueurs, à chaque transaction.",
  },
  {
    id: "bourse-grosse-transaction",
    topic: "Bourse",
    prompt: "Une grosse vente d'un coup fait bouger le prix autant que la même quantité vendue en plusieurs petites transactions.",
    correctAnswer: false,
    explanation:
      "Faux — une transaction plus grosse déplace davantage les réserves du marché, donc fait bouger le prix plus fort qu'un ordre étalé.",
  },
  {
    id: "placements-volatilite",
    topic: "Placements",
    prompt: "Tous les actifs financiers (actions, cryptomonnaies, art) ont exactement la même volatilité.",
    correctAnswer: false,
    explanation: "Faux — chaque actif a sa propre volatilité : la cryptomonnaie est nettement plus volatile que l'art, par exemple.",
  },
  {
    id: "placements-franchise-partagee",
    topic: "Placements",
    prompt: "La franchise sur les plus-values est partagée entre l'épargne et les placements financiers.",
    correctAnswer: true,
    explanation: "Vrai — c'est une seule et même franchise à vie, consommée par toutes tes plus-values réalisées, quelle que soit leur origine.",
  },
  {
    id: "don-joueur-taxe",
    topic: "Dons",
    prompt: "Un don à un autre joueur n'est jamais taxé, contrairement à un don à une cause.",
    correctAnswer: false,
    explanation:
      "Faux — c'est l'inverse : un don entre joueurs est taxé, alors qu'un don à une cause reconnue donne droit à une RÉDUCTION d'impôt.",
  },
  {
    id: "don-cause-plafond",
    topic: "Dons",
    prompt: "La réduction d'impôt pour don à une cause reconnue est plafonnée chaque année.",
    correctAnswer: true,
    explanation: "Vrai — au-delà du plafond annuel, le don supplémentaire ne donne plus droit à la réduction.",
  },
  {
    id: "investissement-rendement",
    topic: "Investissement",
    prompt: "Investir plus d'argent d'un coup dans un levier d'entreprise permet d'accélérer sa progression.",
    correctAnswer: false,
    explanation:
      "Faux — chaque levier est plafonné par action et par cooldown : impossible d'accélérer avec plus d'argent, seul le temps fait progresser un levier.",
  },
  {
    id: "investissement-rd",
    topic: "R&D",
    prompt: "Le niveau de R&D d'une entreprise débloque de nouvelles gammes de produits par paliers.",
    correctAnswer: true,
    explanation: "Vrai — chaque palier de R&D atteint débloque une nouvelle gamme, avec sa propre économie de prix et de coûts.",
  },
  {
    id: "investissement-capacite",
    topic: "Production",
    prompt: "La capacité de production d'une entreprise dépend uniquement de son équipement.",
    correctAnswer: false,
    explanation:
      "Faux — elle dépend aussi du nombre d'employés et de leur efficacité (liée au moral du département), pas seulement de l'équipement.",
  },
  {
    id: "departement-moral",
    topic: "Départements",
    prompt: "Le moral d'un département influence directement l'efficacité de production des employés qui y sont assignés.",
    correctAnswer: true,
    explanation: "Vrai — une équipe démoralisée produit à seulement la moitié de son potentiel, une équipe épanouie jusqu'à 1,5×.",
  },
  {
    id: "departement-responsable",
    topic: "Départements",
    prompt: "Nommer un responsable de département fait remonter le moral instantanément.",
    correctAnswer: false,
    explanation: "Faux — le moral dérive lentement vers sa nouvelle base, cycle après cycle, jamais instantanément.",
  },
  {
    id: "biens-depreciation",
    topic: "Biens personnels",
    prompt: "Un bien de consommation garde toute sa valeur de revente tant que tu le possèdes.",
    correctAnswer: false,
    explanation: "Faux — sa valeur de revente se déprécie progressivement avec le temps, jusqu'à un plancher résiduel.",
  },
  {
    id: "biens-cumul",
    topic: "Biens personnels",
    prompt: "Le bonus de bien-être de plusieurs biens de consommation possédés en même temps se cumule.",
    correctAnswer: true,
    explanation: "Vrai — chaque bien possédé ajoute son propre bonus passif, cumulable avec les autres.",
  },
  {
    id: "tresorerie-profit",
    topic: "Finance d'entreprise",
    prompt: "Le profit d'une entreprise augmente automatiquement sa trésorerie disponible.",
    correctAnswer: false,
    explanation:
      "Faux — sous la politique dividende, le profit part directement aux actionnaires ; il ne grossit la trésorerie que via un réinvestissement automatique explicitement configuré.",
  },
  {
    id: "tresorerie-employes",
    topic: "Finance d'entreprise",
    prompt: "Une entreprise rentable ne peut jamais être forcée de licencier faute de trésorerie.",
    correctAnswer: false,
    explanation:
      "Faux — profit comptable et trésorerie réelle sont deux choses différentes : une entreprise peut être rentable sur le papier et manquer de cash pour payer ses salaires.",
  },
  {
    id: "expansion-conditions",
    topic: "Entreprises",
    prompt: "Fonder une deuxième entreprise ne demande que d'avoir assez d'argent.",
    correctAnswer: false,
    explanation:
      "Faux — il faut aussi avoir fait ses preuves sur une entreprise existante (temps d'activité + profit cumulé), pas seulement le capital.",
  },
  {
    id: "expansion-cout",
    topic: "Entreprises",
    prompt: "Chaque entreprise supplémentaire coûte le même prix à fonder que la précédente.",
    correctAnswer: false,
    explanation: "Faux — le coût de fondation double à chaque entreprise supplémentaire.",
  },
  {
    id: "immobilier-etat",
    topic: "Immobilier",
    prompt: "Un bien loué se dégrade plus vite qu'un bien vacant.",
    correctAnswer: true,
    explanation: "Vrai — l'usure par un locataire fait perdre de l'état deux fois plus vite qu'un bien laissé vacant.",
  },
  {
    id: "immobilier-renovation",
    topic: "Immobilier",
    prompt: "Rénover un bien coûte un pourcentage fixe de sa valeur, pas un montant fixe.",
    correctAnswer: true,
    explanation: "Vrai — le coût de rénovation est proportionnel à la valeur du bien, pas une somme forfaitaire.",
  },
  {
    id: "prestige-avantage",
    topic: "Prestige",
    prompt: "Personnaliser le nom d'un bien de prestige améliore son loyer potentiel.",
    correctAnswer: false,
    explanation: "Faux — c'est purement cosmétique, sans aucun effet économique, juste un statut social visible par les autres joueurs.",
  },
  {
    id: "presse-fiction",
    topic: "Presse",
    prompt: "Les articles de presse du jeu sont parfois inventés pour créer de l'ambiance.",
    correctAnswer: false,
    explanation: "Faux — chaque article correspond à un événement réel qui s'est produit dans la partie, jamais un texte décoratif fictif.",
  },
  {
    id: "cycle-automatique",
    topic: "Cycles",
    prompt: "Un cycle de jeu se clôture uniquement quand un joueur se connecte.",
    correctAnswer: false,
    explanation: "Faux — la clôture est automatique et périodique, déclenchée par le serveur, jamais par une action d'un joueur.",
  },
  {
    id: "reputation-usage",
    topic: "Réputation",
    prompt: "La réputation n'a aucun effet pratique, c'est juste un chiffre décoratif.",
    correctAnswer: false,
    explanation: "Faux — certains petits boulots et emplois exigent un minimum de réputation pour être accessibles.",
  },
  {
    id: "reputation-faillite",
    topic: "Réputation",
    prompt: "Une faillite d'entreprise fait baisser la réputation du propriétaire.",
    correctAnswer: true,
    explanation: "Vrai — la faillite d'une entreprise entraîne une pénalité de réputation pour son actionnaire principal.",
  },
  {
    id: "epargne-arbitrage",
    topic: "Épargne",
    prompt: "Plus un compte d'épargne bloque l'argent longtemps, plus son taux est généralement élevé.",
    correctAnswer: true,
    explanation: "Vrai — c'est l'arbitrage classique liquidité contre rendement : le livret (libre) rapporte moins qu'un compte à terme plus long.",
  },
  {
    id: "epargne-retrait-anticipe",
    topic: "Épargne",
    prompt: "Un retrait anticipé d'un compte à terme ne coûte rien tant que le capital de départ est respecté.",
    correctAnswer: false,
    explanation: "Faux — un retrait anticipé d'un compte à terme fait perdre tous les intérêts courus depuis l'ouverture.",
  },
  {
    id: "isoc-base",
    topic: "ISOC",
    prompt: "L'ISOC est calculé sur le chiffre d'affaires d'une entreprise, pas sur son profit.",
    correctAnswer: false,
    explanation: "Faux — l'ISOC (impôt des sociétés) se calcule sur le PROFIT (bénéfice), pas sur le chiffre d'affaires.",
  },
];
