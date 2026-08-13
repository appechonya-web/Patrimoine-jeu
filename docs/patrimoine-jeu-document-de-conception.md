# [Nom à définir] — Document de conception

## 1. Vision

Un jeu de gestion de patrimoine en ligne, ancré dans la réalité économique et fiscale belge, où les joueurs partent du bas de l'échelle et construisent un patrimoine complet (immobilier, entreprises, bourse, crypto, art) en compétition directe et indirecte les uns avec les autres. Le jeu est pensé comme une expérience lente et persistante — pas une course rapide — avec une vraie ambition d'apprentissage : comprendre comment fonctionnent réellement l'argent, les impôts, le risque et l'entrepreneuriat.

**Piliers fondateurs :**
- Réalisme économique et fiscal (règles belges officielles)
- Compétition à la fois directe (marché partagé, enchères, rachats) et indirecte (classements multiples)
- Le mérite doit pouvoir rattraper l'ancienneté
- La richesse reste fragile à tout moment, pour tout le monde
- La richesse a une utilité sociale, pas seulement individuelle

---

## 2. Boucle de jeu

**Rythme hybride :**
- **Couche temps réel continue** : les marchés évoluent en continu (bourse, crypto, annonces immobilières, enchères), les joueurs peuvent agir à tout moment.
- **Couche cyclique** (ex. hebdomadaire) : clôture de cycle où sont calculés loyers perçus, résultats d'entreprise, intérêts d'emprunt, impôts, et où tombent les événements macro/sectoriels/locaux.

Ce double rythme permet à deux profils de joueurs de coexister : les actifs (qui tradent en continu) et les stratèges (qui posent des positions et reviennent au cycle suivant).

**Structure de partie :** un monde persistant unique, sans fin prévue, sans reset de saison. Pas de bonus de rattrapage artificiel pour les nouveaux arrivants — l'équilibrage se fait par le design économique (voir section 4) plutôt que par des règles arbitraires.

---

## 3. Point de départ et voies de revenu

Tous les joueurs démarrent salariés, avec un emploi de base soumis aux vraies retenues fiscales et sociales, et zéro patrimoine. À partir de là, plusieurs voies possibles, cumulables :

- Épargner et investir en bourse
- Épargner un apport et emprunter pour un premier bien immobilier locatif
- Lancer une entreprise (personne physique/indépendant ou société)
- Se former pour augmenter son salaire ou changer de métier
- Combiner plusieurs voies

---

## 4. Modèle économique — offre, demande et équilibrage naturel

**Principe central :** la taille du marché (demande) est fonction du nombre de joueurs actifs, pas fixe. Un mix à deux étages :

- **Demande NPC de base** : une population simulée, dont la taille croît avec le nombre de joueurs actifs, loue les logements résidentiels et consomme les produits/services des entreprises.
- **Commerce entre joueurs** : notamment via l'immobilier commercial (les entreprises louent leurs locaux à des joueurs propriétaires) et via les chaînes d'approvisionnement sectorielles (voir section 8).

**Répartition de la demande entre concurrents :**
- Immobilier résidentiel : probabilité de location dépendant du ratio demande NPC / offre totale comparable — trop d'offre par rapport à la population fait grimper la vacance partout, naturellement.
- Entreprises d'un même secteur : chaque entreprise reçoit une part du chiffre d'affaires sectoriel proportionnelle à son "score d'attractivité" (investissement marketing, qualité, prix) relatif aux concurrents — rendements décroissants naturels, jamais de plafond artificiel.

**Pourquoi ça résout l'effet boule de neige :** un empire trop gros devient inefficace par lui-même si la demande réelle ne suit pas (vacance, dilution de part de marché). Chaque nouveau joueur agrandit le gâteau total plutôt que d'arriver pour se battre sur des miettes.

---

## 5. Classes d'actifs (MVP : immobilier + entreprises)

### Immobilier
- Annonces limitées, renouvelées par cycle, visibles par tous — enchères en cas de concurrence sur un même bien
- Achat, location, rénovation (augmente loyer/valeur), revente
- Risque réel : vacance locative, impayés, dégradation

### Entreprises
- Le joueur choisit un secteur ; chaque secteur a une demande totale partagée entre concurrents (voir section 4)
- Leviers : investissement marketing, embauches, R&D
- Peut être rachetée par un autre joueur (mise en vente, faillite, ou à terme rachat hostile)
- Lien avec l'immobilier : les entreprises louent leurs locaux commerciaux à des joueurs propriétaires

*(Bourse, crypto, art : prévus en extension après validation du MVP immobilier + entreprises)*

---

## 6. Compétition directe et indirecte

- **Indirecte** : classements multiples — valeur nette absolue, mais aussi meilleur ROI, plus forte croissance récente (30-90 jours), plus gros empire dans une catégorie — pour que le mérite récent compte autant que l'ancienneté.
- **Directe** : marché partagé où les prix bougent selon l'activité réelle des joueurs, enchères en temps réel, rachats d'entreprises, guerres de parts de marché sectorielles.

---

## 7. Fiscalité — règles belges réelles (v1)

Objectif : fidélité maximale aux règles officielles, avec régionalisation complète (3 régions + ~580 communes dès le départ). Architecture en deux niveaux : les règles/formules (identiques partout, propres aux régions pour certains aspects) + un tableau de paramètres locaux (taux par commune), à importer depuis les sources officielles plutôt que saisi à la main.

**Impôt des personnes physiques (IPP)** — salaires, loyers, bénéfices d'indépendant
- Quotité exemptée d'impôt : 10 910 € (EI 2026)
- 4 tranches progressives : 25 %, 40 %, 45 %, 50 % (le taux marginal de 50 % s'applique dès 46 440/49 840 € selon la source — à vérifier précisément à l'implémentation)
- Cotisations sociales salarié : 13,07 % du brut, déduites avant calcul de l'impôt
- Additionnels communaux : 0 à 9 %+ selon la commune, moyenne nationale ~7 %

**Cotisations sociales indépendant**
- 20,5 % jusqu'à 75 024,54 €, puis 14,16 % jusqu'à 110 562,42 €, exonération au-delà
- Cotisation minimale ~917,58 €/trimestre même sans revenu (risque réel pour un joueur qui se lance)
- Réduction pour les starters (3 premières années)

**Impôt des sociétés (ISOC)**
- Taux normal : 25 %
- Taux réduit PME : 20 % sur les premiers 100 000 € de bénéfice, sous conditions (rémunération minimale du dirigeant ~50 000 € bruts, actionnariat majoritaire de personnes physiques, société non financière)

**Plus-values sur actifs financiers (nouveauté 2026)**
- Taxe de 10 % sur les plus-values réalisées (actions, obligations, crypto...) depuis le 1er janvier 2026
- Exonération de 10 000 €/an/personne, report partiel possible sur 5 ans (max 15 000 €)
- Grande opportunité pédagogique : la Belgique était une exception européenne (plus-values généralement exonérées) jusqu'à cette réforme

**Droits d'enregistrement (achat immobilier)** — gros écarts régionaux
- Flandre : 12 % standard / 2 % résidence principale unique
- Wallonie : 12,5 % standard / 3 % primo-acquéreur résidence principale
- Bruxelles : 12,5 % avec abattement (jusqu'à ~25 000 € d'économie) pour résidence principale

*(Chiffres à reconfirmer précisément aux sources officielles — SPF Finances, administrations régionales — au moment de l'implémentation, certaines mesures 2026 étant encore en évolution.)*

---

## 8. Secteurs d'entreprises — chaîne de valeur en paliers

Progression individuelle : chaque joueur débloque personnellement l'accès aux niveaux supérieurs.

| Niveau | Secteurs | Condition de déblocage |
|---|---|---|
| 0 — Matières premières | Bois, métaux, agriculture, textile brut, extraction | Aucune, accessible dès le départ |
| 1 — Transformation/Industrie | Construction, ameublement, métallurgie, textile transformé | Capital + expérience minimale niveau 0 |
| 2 — Grand public avancé | Électronique, automobile, alimentation transformée, mode | Capital + parcours entrepreneurial démontré (CA cumulé niveau 1) |
| 3 — Infrastructure/finance | Banque, énergie, assurance, technologie | Capital important + expérience élevée + réputation + éventuelle formation |

Les niveaux 1+ nécessitent souvent d'acheter les intrants produits par des joueurs de niveaux inférieurs → commerce B2B organique entre joueurs.

**Secteurs infrastructure — cas particuliers :**
- **Énergie** : coût d'input pour toutes les autres entreprises — un joueur qui domine ce secteur influence les coûts de tout le monde
- **Banque** : peut prêter aux autres joueurs, en concurrence avec la banque système par défaut ; exige une réserve de solvabilité proportionnelle aux encours (risque réel de faillite en cascade)
- **Assurance** : les joueurs peuvent s'assurer contre certains risques auprès d'un joueur-assureur

---

## 9. Progression : richesse, réputation, expérience — trois monnaies séparées

- **Richesse** : fluctue, peut s'effondrer, classement principal mais pas seul
- **Réputation** : construite par la qualité des décisions (paiement des impôts, traitement des employés-joueurs, mécénat, tenue des engagements) — ouvre l'accès à de meilleurs taux, deals exclusifs, poids communal ; peut baisser (faillite, licenciements brutaux, fraude détectée)
- **Expérience** : ne descend jamais, cumulée à partir de tout ce qui a été géré (taille des entreprises dirigées, durée sans défaut, secteurs traversés, crises survécues) — une faillite après une vraie lutte rapporte plus d'expérience qu'une petite affaire jamais mise à l'épreuve

**Rattrapage par le mérite (pas par bonus artificiel) :**
- Classements de performance récente (croissance 30-90 jours), accessibles à tout joueur à tout moment
- Capacité d'emprunt basée sur le profil de discipline (ratio dette/revenu, historique) plutôt que sur la seule taille du patrimoine
- Paliers de compétence débloquables à tout moment de la partie

**Fragilité maintenue à tout niveau de richesse :**
- Charges récurrentes croissantes avec le train de vie (biens de prestige, employés, dettes)
- Aucune protection "too big to fail" — saisie possible pour tout joueur surendetté en défaut
- Distinction visible entre patrimoine affiché et patrimoine liquide/sain

---

## 9bis. Bien-être — quatrième dimension du joueur

En plus de la richesse, la réputation et l'expérience : un indice de bien-être (0-100, neutre ~50) qui **fluctue en continu**, contrairement à l'expérience qui ne fait que croître.

**Trois zones d'effet :**
- **Épanoui (70-100)** : bonus modeste et croissant sur les revenus/résultats d'entreprise, expérience acquise légèrement plus vite
- **Neutre (30-70)** : aucun effet
- **Burnout (0-30)** : malus croissant sur les performances (score d'attractivité d'entreprise pénalisé, décisions dégradées)

**Sources de hausse :** rénovation/confort de la résidence personnelle (durable), loisirs/vacances récurrents (temporaire, à renouveler), engagement communautaire et mécénat (nourrit aussi le bien-être, pas seulement la réputation).

**Sources de baisse :** charge de travail excessive (trop d'activités actives gérées simultanément sans repos, au-delà d'un seuil), négligence de la résidence personnelle.

**Lien avec l'expérience :** le seuil de charge de travail supportable avant burnout dépend du niveau d'expérience du joueur — un joueur aguerri encaisse plus d'activités simultanées qu'un débutant.

**Récupération non instantanée :** sortir du burnout demande plusieurs cycles d'investissement soutenu (repos, rénovation, réduction volontaire d'activités), pas un geste ponctuel — vrai coût de tempo pour qui s'est trop dispersé.

---

## 10. Faillite et "fresh start"

Inspiré directement du vrai droit belge de l'insolvabilité (principe d'"excusabilité"/effacement des dettes, loi réformée pour encourager la seconde chance) :
- À la faillite : effacement des dettes (sauf exceptions à définir), liquidation des actifs, retour au bas de l'échelle
- L'expérience acquise est intégralement conservée
- Avantages de relance liés à l'expérience, jamais en argent gratuit : accès facilité au crédit malgré un faible capital, croissance plus rapide dans un secteur déjà connu, friction administrative réduite
- Titre/niveau d'expérience affiché séparément du classement de fortune (ex. "Entrepreneur aguerri" avec un compte à zéro)

---

## 11. Usages sociaux de la richesse

- Investissement dans les infrastructures communales — bénéfice partagé pour tous les joueurs de la zone, statut visible pour le financeur
- Mécénat/fondations — réduction fiscale réelle + réputation, bénéfice pour d'autres joueurs soutenus
- Employeur d'autres joueurs — salaire réel versé à des joueurs-employés/managers
- Immobilier de prestige personnalisable — statut social visible, sans avantage économique direct
- Capital-risque entre joueurs — financement de l'entreprise d'un autre joueur contre des parts
- Conseil communal/chambre de commerce jouable — les joueurs influents d'une zone peuvent peser sur certains paramètres locaux
- "Presse économique" du jeu — rend visibles les scandales et réussites, théâtre économique vivant

---

## 12bis. Parcours joueur type (fil rouge)

- **Semaine 1** : salaire de départ, tableau de bord simple (solde, prochain versement, quotité exemptée expliquée), accès uniquement au niveau 0 (matières premières) et à l'immobilier.
- **Tableau de bord permanent** : vue patrimoine (affiché vs liquide/sain), compte à rebours du cycle avec aperçu prévisionnel, fil d'alertes (loyers impayés, enchères qui expirent, échéances de prêt, propositions d'autres joueurs) — visible aussi hors ligne (notifications).
- **Quelques mois plus tard** : marché B2B entre joueurs (achat de matières premières à d'autres joueurs), ajustement des leviers face à la concurrence sectorielle, choix de commune pour l'implantation (fiscalité locale), premières interactions commerciales directes (bail commercial proposé par un autre joueur).
- **Clôture de cycle** : moment fort visuel — relevé patrimonial détaillé (loyers, résultat d'entreprise, impôts détaillés par type, événements du cycle).
- **Joueur établi** : ambitions niveau 3 (ex. banque), vérification de l'éligibilité (expérience/réputation/capital), "presse économique" du jeu relayant les réussites et faillites d'autres joueurs.

---

## 12ter. Système d'événements aléatoires

**Principe :** événements totalement aléatoires par cycle (probabilité indépendante à chaque tirage, jamais scriptés), pour que tous les secteurs — même les moins évidents — gardent une vraie valeur spéculative/d'option (ex. la pharmaceutique, boudée en temps normal, peut exploser en cas d'épidémie).

**Quatre paliers de rareté/impact :**
- **Mineurs, fréquents** : petites variations sectorielles locales, effet limité et court
- **Moyens, occasionnels** : choc sectoriel régional réel
- **Majeurs, rares** : chocs sévères (épidémie, crise climatique, rupture technologique)
- **Exceptionnels, cygnes noirs** : quasi jamais, mais dévastateurs/transformateurs

**Mécanique d'effet :**
- Multiplicateur de demande temporaire sur le(s) secteur(s)/zone(s) touché(s), qui s'ajoute par-dessus le score d'attractivité (marketing/qualité/prix) — le mérite continue de compter même en plein boom sectoriel
- Effets corrélés, pas isolés (ex. épidémie = boost pharma + baisse tourisme/hôtellerie simultanément) → crée de vraies stratégies de couverture entre secteurs
- Portée géographique variable, réutilisant la granularité région/commune de la fiscalité (un événement climatique peut ne toucher qu'une commune, une crise économique peut être nationale)

**Signes avant-coureurs (dégradé selon le palier) :**
- Mineurs : zéro signal, surprise totale
- Moyens : généralement surprise, rumeur de dernière minute possible
- Majeurs : signaux faibles quelques cycles avant (bulletin "presse économique" du jeu), sans certitude de survenue ni de magnitude — récompense l'attention sans donner de certitude exploitable
- Exceptionnels/cygnes noirs : zéro signal par définition

**Dégâts directs sur actifs et lien avec l'assurance :**
- Réservés aux paliers moyens à exceptionnels (les mineurs restent des effets de marché purs)
- Un joueur peut s'assurer (secteur niveau 3, joueur-assureur ou assureur système par défaut) contre certains risques (incendie, inondation, perte d'exploitation sectorielle)
- L'assureur-joueur doit maintenir une réserve proportionnelle à ses engagements — risque de faillite en cascade si un événement régional touche plusieurs assurés en même temps (risque de concentration, réaliste)
- Un joueur non assuré touché par un sinistre encaisse la perte intégrale — vrai arbitrage prime récurrente vs risque assumé

---

## 12quinquies. Communication et groupes entre joueurs

**Principe :** le mode de communication et de pouvoir de décision dépend du type de relation entre joueurs, pas d'un chat générique unique.

- **Entreprise (employeur ↔ employés)** : relation hiérarchique/contractuelle. Le patron fixe objectifs et directives, publie des rapports de performance ; l'employé dispose d'un canal de négociation salariale/conditions. Communication à sens plutôt descendant.
- **Partenariat d'investissement/actionnariat** : relation horizontale, parts détenues. Propositions/contre-propositions pour tout investissement conjoint, vote proportionnel aux parts pour les décisions stratégiques (façon assemblée générale), tableau de bord partagé, répartition automatique des dividendes.
- **Guildes/associations sectorielles ou communales** : plus ouvertes, membres ajoutés au besoin. Espace d'échange et de coordination (info, prix indicatifs, projets communaux collectifs). Rejoint le "conseil communal" évoqué en section 11.

**Cartels et droit de la concurrence (inspiré du droit belge réel) :**
- Une guilde sectorielle peut servir à coordonner des prix entre concurrents, mais ce n'est pas sans risque
- Chaque cycle, une entente active a une probabilité de détection croissante avec sa taille, sa durée et l'ampleur de la distorsion de prix causée
- Sanction en cas de découverte : amende (jusqu'à un pourcentage du chiffre d'affaires) + coup porté à la réputation de tous les participants
- **Programme de clémence** : un membre peut dénoncer l'entente avant détection pour une immunité totale ; les dénonciations suivantes (avant découverte officielle) obtiennent des réductions dégressives selon leur rang — crée un vrai dilemme du prisonnier entre joueurs coalisés

---

## 12sexies. Notifications et engagement asynchrone

**Principe :** le jeu doit rester compétitif et vivant sans exiger une connexion permanente — cohérent avec le rythme lent voulu et avec le système de bien-être/burnout.

**Deux niveaux de notification :**
- Urgent, avec fenêtre d'action (enchère qui se termine, échéance de prêt proche du défaut, proposition de partenaire en attente, employé qui menace de partir) : notification push/email directe
- Informatif (relevé de cycle, presse économique, mouvements de la concurrence) : regroupé en digest périodique plutôt qu'en flux continu

**Alerte mail :** activable sur demande par le joueur, mais volontairement rare — réservée aux événements graves uniquement (défaut de paiement imminent, saisie, enchère cruciale qui se termine), pour ne jamais devenir une source de sollicitation quotidienne fatigante.

**Enchères par procuration** : plafond fixé à l'avance par le joueur, le système enchérit automatiquement jusqu'à ce plafond en son absence — évite qu'un joueur perde systématiquement les opportunités faute d'être connecté au bon moment.

**Règles par défaut configurables** : renouvellement de bail au prix du marché, refus automatique des invitations à une entente suspecte, plafond de réinvestissement automatique des bénéfices, etc.

**Managers (NPC ou joueur rémunéré)** : embauchables pour faire tourner une activité en pilote semi-automatique en l'absence du joueur, contre salaire. Performance légèrement réduite vs gestion active, mais évite l'effondrement — et surtout, allège la charge de travail donc protège le bien-être. Relie directement ce système à celui du bien-être/burnout (section 9bis) et à l'employeur/employé (section 12quinquies).

---

## 12septies. Enchères immobilières et rachats d'entreprises

**Enchères immobilières** : enchère ascendante avec fenêtre de temps limitée quand plusieurs joueurs veulent le même bien, prix le plus haut visible en direct (matière pour la presse économique du jeu), combinée aux enchères par procuration (section 12sexies) pour ne pénaliser personne pour son fuseau horaire.

**Rachat amical d'entreprise** : négociation privée directe entre vendeur et acheteur(s) intéressé(s), avec possibilité de mise en concurrence si plusieurs acheteurs se manifestent.

**Rachat hostile** : possible dès qu'une entreprise est structurée en société à parts (modèle actionnariat, section 12quinquies). Un joueur peut racheter progressivement des parts sur le marché secondaire, sans l'accord du dirigeant, jusqu'à franchir le seuil de contrôle (50%+1). Le dirigeant risque de perdre le contrôle s'il ne détient pas la majorité ou ne s'allie pas avec d'autres actionnaires. *(Mécanismes de défense — rachat d'urgence, dilution — en raffinement futur.)*

**Vente en faillite** : liquidation des actifs séparément ou cession de l'ensemble à prix cassé au plus offrant.

---

## 12octies. Prêt bancaire détaillé

**Banque système (par défaut, toujours disponible)** : taux basés sur le profil de solvabilité (réputation, ratio dette/revenu, historique — pas seulement la valeur nette). Chaque prêt : capital, taux, durée/échéancier, garantie (hypothèque sur le bien acheté). Détail réaliste : la banque finance le prix du bien mais pas les frais annexes (droits d'enregistrement, notaire) — épargne personnelle nécessaire pour ça, comme dans la réalité.

**Banques-joueurs** : une fois le secteur niveau 3 débloqué, un joueur fonde sa banque avec le capital de solvabilité requis, fixe ses propres taux/conditions, entre en concurrence avec la banque système et les autres banques-joueurs. Chaque défaut d'emprunteur ponctionne ses réserves ; en cas de franchissement du ratio de solvabilité, la banque-joueur risque elle-même l'insolvabilité (défaut en cascade). Une "cote" de fiabilité publique par banque-joueur permet aux emprunteurs de choisir en connaissance de cause.

**Défaut de paiement** : saisie de la garantie, coup porté à la réputation, déclenchement de la procédure de faillite/fresh start si insolvabilité globale (section 10). Remboursement anticipé possible avec pénalité réaliste.

---

## 13. Portée du MVP

- Joueurs simultanés visés : quelques centaines
- Classes d'actifs de départ : immobilier + entreprises
- Secteurs de départ : matières premières (niveau 0), extension progressive vers les niveaux supérieurs
- Fiscalité : Belgique, niveau de détail élevé, couverture communale complète (données à importer plutôt qu'à modéliser une par une)
- Pas de saisons, monde persistant dès le lancement
