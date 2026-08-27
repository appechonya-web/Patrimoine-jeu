import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer } from "../../lib/session";
import styles from "../page.module.css";
import guideStyles from "./guide.module.css";

const SECTIONS = [
  { id: "cycle", label: "⏳ Le temps du jeu" },
  { id: "fiscalite", label: "🏛️ La fiscalité belge simulée" },
  { id: "emploi", label: "💼 Emploi & carrière" },
  { id: "bien-etre", label: "💗 Bien-être & vie personnelle" },
  { id: "immobilier", label: "🏘️ Immobilier" },
  { id: "epargne", label: "🐷 Épargne" },
  { id: "placements", label: "📈 Placements & bourse de matières premières" },
  { id: "entreprises", label: "🏢 Fonder et faire tourner une entreprise" },
  { id: "marche", label: "🥊 Marché, compétitivité & attractivité" },
  { id: "finance-entreprise", label: "💰 Finance d'entreprise" },
  { id: "capital-rachat", label: "⚔️ Capital-risque, rachats & prêts entre joueurs" },
  { id: "provinces", label: "🏛️ Provinces & vie communale" },
  { id: "portefeuille", label: "💼 Portefeuille & récap de cycle" },
  { id: "engagement", label: "🎯 Défis, prime quotidienne & quiz fiscal" },
  { id: "info", label: "📰 Classement, presse & prestige" },
  { id: "dons", label: "🎁 Dons" },
  { id: "notifications", label: "🔔 Journal de notifications" },
  { id: "cartels", label: "🤝 Cartels (désactivés)" },
  { id: "astuces", label: "💡 Astuces stratégiques" },
] as const;

export default async function GuidePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>📖 Guide du jeu</h1>
          <p className={styles.subtitle}>
            Tout ce qu'il y a à savoir pour jouer en connaissance de cause — chaque mécanique, chaque chiffre, chaque
            astuce, en un seul endroit.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <nav className={guideStyles.toc} aria-label="Sommaire">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={guideStyles.tocLink}>
            {s.label}
          </a>
        ))}
      </nav>

      <div className={guideStyles.content}>
        <section id="cycle" className={guideStyles.guideSection}>
          <h2>⏳ Le temps du jeu</h2>
          <p>
            Le jeu avance par <strong>cycles</strong>, pas en temps réel continu. Un cycle dure 30 minutes réelles ;
            à sa clôture automatique, le serveur calcule d'un coup tout ce qui s'est accumulé pendant cette
            période pour tout le monde : salaires versés, loyers perçus, intérêts d'épargne et de dépôts bancaires,
            dividendes, échéances de prêts, impôts, production et ventes des entreprises, événements aléatoires
            (sectoriels et personnels), dégradation des biens immobiliers, etc. Tu n'as rien à déclencher toi-même
            pour que ça se produise.
          </p>
          <p>
            <strong>365 cycles = une année de jeu.</strong> C'est la base utilisée pour annualiser les salaires,
            les revenus d'indépendant et les impôts (exactement comme un vrai exercice fiscal), même si un cycle ne
            dure que 30 minutes réelles. La barre en haut du tableau de bord affiche le cycle en cours, le
            décompte avant la prochaine clôture, et où tu en es dans l'année de jeu (jour X/365).
          </p>
          <p>
            Tout ce qui n'est <em>pas</em> lié à la production ou aux revenus périodiques — acheter/vendre un
            bien, un placement, une matière première, faire un don, investir dans une entreprise ou une commune —
            s'applique <strong>immédiatement</strong>, sans attendre la clôture. Seuls les revenus/dépenses
            périodiques (salaire, loyers, intérêts, dividendes, impôts, prêts) sont réglés à la clôture.
          </p>
        </section>

        <section id="fiscalite" className={guideStyles.guideSection}>
          <h2>🏛️ La fiscalité belge simulée</h2>
          <p>
            Le jeu applique un vrai barème progressif d'impôt des personnes physiques (IPP), pas un taux forfaitaire
            — comprendre ce barème aide à comprendre pourquoi ton salaire net n'augmente jamais proportionnellement
            à ton salaire brut.
          </p>
          <ul className={guideStyles.list}>
            <li>
              <strong>Exonération de base :</strong> les premiers 10 910 €/an de revenu ne sont jamais taxés.
            </li>
            <li>
              <strong>Tranches progressives</strong> au-delà : 25% jusqu'à 15 200 €, 40% jusqu'à 26 830 €, 45%
              jusqu'à 46 440 €, 50% au-delà — chaque tranche ne taxe que la portion de revenu qui s'y trouve, jamais
              tout le revenu au taux le plus élevé atteint.
            </li>
            <li>
              <strong>Cotisations sociales salarié :</strong> 13,07% prélevés sur le brut avant même le calcul de
              l'IPP.
            </li>
            <li>
              <strong>Centimes additionnels communaux :</strong> +7,5% de taxe supplémentaire sur l'impôt fédéral
              déjà calculé (un taux forfaitaire dans le jeu, faute de commune de résidence suivie pour le joueur).
            </li>
            <li>
              <strong>Indépendant complémentaire :</strong> cotisations sociales séparées, elles aussi progressives
              (20,5% puis 14,16% puis 0% au-delà de 110 562,42 €), calculées sur le revenu annexe agrégé au salaire
              principal pour l'IPP — un revenu annexe ajouté au sommet d'un salaire déjà taxé subit le taux
              marginal le plus haut atteint, pas un taux moyen.
            </li>
            <li>
              <strong>ISOC (impôt des sociétés) :</strong> 20% sous 100 000 €/an de profit, 25% au-delà — payé par
              l'entreprise elle-même, avant toute distribution aux actionnaires.
            </li>
            <li>
              <strong>Précompte mobilier (dividendes) :</strong> 30% supplémentaires retenus à la source sur
              chaque dividende versé — que ce soit ta part de profit en tant qu'actionnaire d'entreprise ou le
              dividende d'une action détenue en bourse. C'est un impôt qui s'ajoute à l'ISOC déjà payé par
              l'entreprise, pas un remplacement.
            </li>
            <li>
              <strong>Plus-values (bourse, épargne) :</strong> 10% sur la plus-value réalisée à la revente, avec
              une <strong>franchise à vie de 10 000 €</strong> partagée entre TOUS tes placements et intérêts
              d'épargne cumulés (pas une franchise annuelle) — au-delà, chaque euro de plus-value ou d'intérêt est
              taxé à 10%.
            </li>
            <li>
              <strong>Épargne-pension :</strong> réduction d'impôt immédiate de 30% sur chaque versement, plafonnée
              à 1 000 €/an de versements éligibles — un vrai avantage à l'entrée, en échange d'un blocage long avec
              pénalité de sortie anticipée (voir la section Épargne).
            </li>
            <li>
              <strong>Droits d'enregistrement immobiliers :</strong> taxe prélevée immédiatement à l'achat d'un
              bien, en plus du prix affiché — le taux varie par province (généralement entre 6% et 12,5%, réduit
              pour un premier achat de résidence principale) et peut être modifié par un vote du conseil communal
              (voir Provinces).
            </li>
          </ul>
        </section>

        <section id="emploi" className={guideStyles.guideSection}>
          <h2>💼 Emploi & carrière</h2>
          <p>
            Un seul emploi actif à la fois, salaire versé automatiquement à chaque cycle. Deux sources d'emploi :
            un catalogue fixe de métiers NPC (secteur, pression, salaire fixes), ou une offre publiée par un autre
            joueur pour sa propre entreprise (salaire payé depuis la vraie trésorerie de cette entreprise — si elle
            manque de liquidités, tous ses employés-joueurs sont licenciés d'un coup ce cycle-là).
          </p>
          <ul className={guideStyles.list}>
            <li>
              <strong>Pression du poste :</strong> draine ton bien-être à chaque cycle travaillé, atténuée par ton
              ancienneté dans ce secteur (elle augmente ta tolérance avec le temps, jusqu'à -60% de drain à 700
              cycles d'ancienneté).
            </li>
            <li>
              <strong>Changer de secteur</strong> coûte une pénalité de bien-être ponctuelle (jusqu'à 8 points),
              réduite par ton ancienneté dans le NOUVEAU secteur — mieux vaut ne pas papillonner.
            </li>
            <li>
              <strong>Progression de carrière :</strong> 5 paliers selon ton ancienneté dans un même secteur
              (Débutant → Confirmé à 60 cycles → Expérimenté à 180 → Senior à 350 → Expert à 700), chacun
              augmentant ton salaire net (jusqu'à +32% au palier Expert). Changer de secteur repart de zéro sur ce
              compteur.
            </li>
            <li>
              <strong>Activité d'indépendant complémentaire :</strong> possible en plus d'un emploi principal
              (jamais seule), revenu annexe plafonné à 250 €/cycle. Le coût en bien-être augmente avec le carré du
              revenu déclaré — près du plafond, ça draine plus qu'un emploi à forte pression. Perdre l'emploi
              principal met fin automatiquement à l'activité annexe.
            </li>
            <li>
              <strong>Petits boulots :</strong> revenu immédiat ponctuel, cumulable avec un emploi, cooldown propre
              à chacun compté en temps réel (pas en cycles). Certains exigent un minimum de réputation. Le montant
              gagné est tiré au hasard dans une fourchette à chaque fois, pas un montant fixe.
            </li>
          </ul>
        </section>

        <section id="bien-etre" className={guideStyles.guideSection}>
          <h2>💗 Bien-être & vie personnelle</h2>
          <p>
            Le bien-être n'est pas cosmétique : sous 30/100, un malus de revenu s'applique à tous tes revenus
            d'emploi (jusqu'à -25%) ; au-dessus de 70/100, un bonus (jusqu'à +10%). Deux façons d'agir dessus :
          </p>
          <ul className={guideStyles.list}>
            <li>
              <strong>4 axes permanents</strong> (sport, nutrition, social, confort) : un investissement par
              semaine maximum, rendements décroissants comme les leviers d'entreprise. Sport accélère la
              régénération passive de bien-être, nutrition réduit la fatigue au travail, social élargit la zone de
              bonus de revenu, confort amortit le malus de burnout.
            </li>
            <li>
              <strong>Actions ponctuelles :</strong> un boost immédiat contre de l'argent, effet temporaire — ne
              change rien structurellement, contrairement aux axes permanents.
            </li>
            <li>
              <strong>Biens de consommation</strong> (voiture, mobilier, électronique...) : bonus de bien-être
              passif tant que tu les possèdes, cumulable entre plusieurs biens, mais valeur de revente qui se
              déprécie exponentiellement (jusqu'à un plancher de 10% du prix d'achat).
            </li>
            <li>
              <strong>Événements de vie aléatoires :</strong> à chaque cycle, une petite chance (0,8%) qu'un
              événement personnel te touche — héritage, prime, rencontre marquante côté positif ; problème de
              santé, accident (si tu possèdes un véhicule), litige côté négatif. Ni prévisible ni évitable, juste
              la vie qui continue.
            </li>
          </ul>
        </section>

        <section id="immobilier" className={guideStyles.guideSection}>
          <h2>🏘️ Immobilier</h2>
          <p>
            Achète directement au prix affiché ou aux enchères (système à la eBay : ton prix maximal reste secret,
            le prix affiché ne monte qu'au minimum nécessaire pour dépasser le second enchérisseur). Un achat
            direct peut être financé par hypothèque (jusqu'à 80% de la valeur, taux fixé une fois pour toutes selon
            ton profil au moment de l'emprunt).
          </p>
          <ul className={guideStyles.list}>
            <li>
              <strong>État du bien :</strong> se dégrade à chaque cycle, deux fois plus vite s'il est loué. Il
              conditionne directement le loyer réel perçu (le loyer affiché est le loyer à l'état 100/100). Une
              rénovation restaure l'état pour 15% de la valeur du bien.
            </li>
            <li>
              <strong>Immobilier de prestige :</strong> réservé aux biens de type LUXURY, purement social — un nom
              personnalisé affiché publiquement sur la page Prestige. Aucun effet mécanique sur le loyer, la
              valeur ou quoi que ce soit d'économique, juste du statut.
            </li>
            <li>
              L'inventaire de biens disponibles par province grandit avec l'activité économique du jeu (nombre de
              joueurs, investissement communal) — le marché ne s'épuise pas définitivement.
            </li>
          </ul>
        </section>

        <section id="epargne" className={guideStyles.guideSection}>
          <h2>🐷 Épargne</h2>
          <p>Trois produits, un vrai arbitrage liquidité/rendement — plus tu acceptes de bloquer ton argent, plus le taux est élevé :</p>
          <ul className={guideStyles.list}>
            <li>
              <strong>Livret :</strong> retrait et versement libres à tout moment, taux le plus bas.
            </li>
            <li>
              <strong>Compte à terme :</strong> un seul versement à l'ouverture, bloqué pour la durée choisie, taux
              plus élevé — un retrait anticipé fait perdre tous les intérêts courus, seul le montant déposé est
              alors récupéré.
            </li>
            <li>
              <strong>Épargne-pension :</strong> le taux le plus élevé et une réduction d'impôt immédiate à
              l'entrée (30%, plafond 1 000 €/an), mais bloquée le plus longtemps — un retrait anticipé fait perdre
              les intérêts <em>et</em> une partie du capital déposé, une vraie pénalité de sortie.
            </li>
          </ul>
          <p>
            Les intérêts (hors épargne-pension, exonérée) sont taxés à 10% au-delà de la même franchise à vie de
            10 000 € partagée avec les plus-values de placements.
          </p>
        </section>

        <section id="placements" className={guideStyles.guideSection}>
          <h2>📈 Placements & bourse de matières premières</h2>
          <p>
            Deux marchés bien distincts, à ne pas confondre :
          </p>
          <ul className={guideStyles.list}>
            <li>
              <strong>Placements (actions, cryptomonnaie, art) :</strong> chaque actif suit sa propre marche
              aléatoire (dérive + volatilité propres), indépendante des joueurs — personne ne fixe ce prix.
              Certaines actions sont liées à un vrai secteur économique et réagissent en plus aux crises/booms
              sectoriels nationaux. Certaines versent un dividende (jamais la crypto ni l'art), au choix encaissé
              en liquide ou réinvesti automatiquement en davantage de parts — un effet boule de neige pour qui
              reste investi longtemps. Tu peux vendre en indiquant soit une quantité, soit directement un montant
              en euros à récupérer.
            </li>
            <li>
              <strong>Bourse de matières premières :</strong> marché automatisé (AMM) — le prix bouge mécaniquement
              selon les réserves du pool à chaque transaction (achat ou vente, la tienne ou celle d'un autre
              joueur), pas selon un carnet d'ordres. Une grosse transaction d'un coup fait bouger le prix bien
              plus que la même quantité étalée en plusieurs fois. Le pool grandit avec le nombre de joueurs actifs.
            </li>
          </ul>
        </section>

        <section id="entreprises" className={guideStyles.guideSection}>
          <h2>🏢 Fonder et faire tourner une entreprise</h2>
          <p>
            Fonder une entreprise de niveau 0 coûte 4 000 € ; une deuxième entreprise (niveau 0 également) exige
            d'avoir dirigé une première entreprise pendant au moins 728 cycles ET cumulé 20 000 € de profit net sur
            celle-ci, avec un coût qui double à chaque expansion supplémentaire. Une entreprise de niveau 1 (qui
            transforme les matières premières achetées aux entreprises de niveau 0 de son secteur parent) coûte
            15 000 €.
          </p>
          <p>
            <strong>4 gammes de produits</strong>, débloquées par ton niveau de R&D/Innovation (un des 11 leviers
            d'investissement, voir plus bas) : la gamme de fondation (toujours active, niveau 0), économique
            (niveau 15, volume élevé/marge faible), premium (niveau 35, marché restreint/marge élevée), et produit
            de rupture (niveau 60 — la seule gamme qui continue de profiter de chaque futur palier de R&D après
            son lancement). Lancer une nouvelle gamme coûte 1 500 €. Le reste de ta capacité de production non
            alloué aux autres gammes revient automatiquement à la gamme de fondation.
          </p>
          <p><strong>11 leviers d'investissement</strong>, tous à rendements décroissants (racine carrée du montant cumulé investi — les premiers euros comptent beaucoup plus que les suivants), maximum 500 €/action et un cooldown de 7 cycles par levier :</p>
          <ul className={guideStyles.list}>
            <li><strong>Marketing</strong> — plus de demande captée, et fait grossir le marché lui-même collectivement (voir plus bas).</li>
            <li><strong>Qualité (R&D)</strong> — coûte plus cher à produire, mais le marché tolère un prix de référence plus élevé sans perdre de demande.</li>
            <li><strong>Équipement</strong> — plus de capacité de production.</li>
            <li><strong>Automatisation</strong> — réduit le coût de production par unité.</li>
            <li><strong>Conditions de travail</strong> — relève la baseline de moral de tes départements.</li>
            <li><strong>Image de marque (branding)</strong> — amortit les événements négatifs et réduit ta sensibilité au prix (élasticité-demande plus faible).</li>
            <li><strong>R&D / Innovation</strong> — débloque les gammes économique/premium/rupture, amplifie les événements positifs.</li>
            <li><strong>Formation professionnelle</strong> — augmente la capacité apportée par tes employés existants.</li>
            <li><strong>Sécurité au travail</strong> — réduit l'ampleur des événements négatifs liés aux employés.</li>
            <li><strong>Assurance</strong> — relève le plancher de couverture en cas de sinistre.</li>
            <li><strong>Réserve de trésorerie</strong> — pas un levier de production, une allocation de profit.</li>
          </ul>
          <p>
            <strong>Départements & employés :</strong> 4 départements (ventes, R&D, production, RH), chacun avec
            son propre moral vivant (dérive lentement vers une baseline, amputée sans responsable dédié) qui
          pondère directement la capacité de production. Un manager par département stabilise le moral. Posséder
            plusieurs entreprises sans manager dédié pénalise leur capacité (attention divisée) — un vrai
            arbitrage entre expansion et gestion de proximité.
          </p>
        </section>

        <section id="marche" className={guideStyles.guideSection}>
          <h2>🥊 Marché, compétitivité & attractivité</h2>
          <p>
            Les entreprises d'un même (secteur, gamme de produit) ne puisent pas dans une demande infinie — elles
            se partagent un même "gâteau", proportionnellement à leur <strong>compétitivité</strong> relative (un
            score qui combine attractivité, marketing, qualité, image de marque, et surtout le <strong>prix</strong> :
            un prix cassé par rapport au prix de référence de la gamme peut jusqu'à tripler ta compétitivité, un
            prix trop élevé la fait fondre). La fiche de chaque gamme affiche en direct le prix de référence du
            marché et l'effet exact de ton prix actuel — utilise-le avant de fixer un prix à l'aveugle.
          </p>
          <p>
            <strong>Ce qui fait grossir le gâteau lui-même</strong> (pas seulement ta part) :
          </p>
          <ul className={guideStyles.list}>
            <li>Le nombre de joueurs inscrits dans le jeu (l'économie nationale grossit avec la population).</li>
            <li>
              L'investissement <strong>marketing cumulé de toutes les entreprises</strong> actives sur un même
              (secteur, gamme) — un effet de catégorie réaliste : faire connaître un type de produit profite à
              tous ceux qui le vendent, pas seulement à qui a payé la pub. Un niveau marketing combiné de 50 (à
              plusieurs) double déjà la taille de ce marché précis.
            </li>
            <li>
              L'investissement communal en infrastructure (voir Provinces) — à la fois pour l'économie nationale
              globalement, et pour la clientèle locale de ta propre province spécifiquement.
            </li>
          </ul>
          <p>
            <strong>Attractivité effective</strong> = ton score de base (figé à la fondation, ne baisse que sur
            défaut de prêt) + bonus manager (+10) + bonus d'infrastructure de ta province (jusqu'à +15) + bonus
            d'affinité si ton secteur est historiquement ancré dans ta province (+12) — recalculée en direct, pas
            seulement au prochain cycle.
          </p>
        </section>

        <section id="finance-entreprise" className={guideStyles.guideSection}>
          <h2>💰 Finance d'entreprise</h2>
          <ul className={guideStyles.list}>
            <li>
              <strong>Emprunt :</strong> plafonné à 2× tes fonds propres actuels, taux fixé une fois pour toutes
              selon ton ratio dette/fonds propres au moment de l'emprunt (jamais recalculé ensuite, même si ta
              situation change).
            </li>
            <li>
              <strong>Banque-entreprise :</strong> n'importe quelle entreprise peut accepter des dépôts d'un
              joueur — un vrai ratio de solvabilité plafonne l'encours total prêté à 3× ses fonds propres. Un
              retrait est plafonné par ce qu'il reste réellement en caisse (vrai risque de liquidité) ; en cas de
              faillite, les déposants ne récupèrent qu'un prorata de leur dépôt selon la trésorerie disponible.
            </li>
            <li>
              <strong>Assurance :</strong> couvre une partie des pertes d'un aléa négatif contre une prime par
              cycle. L'assureur système est toujours solvable mais peu avantageux ; un assureur-joueur peut
              proposer mieux, avec un vrai risque de ne pas pouvoir payer si plusieurs sinistres tombent le même
              cycle.
            </li>
            <li>
              <strong>Actionnariat & dividendes :</strong> chaque actionnaire reçoit sa part du profit distribuable
              (ou de la perte) au prorata de ses parts, moins 30% de précompte mobilier — y compris les
              actionnaires minoritaires. Le profit peut aussi être mis en réserve (pour une future liquidation) ou
              réinvesti automatiquement dans un levier choisi, avant toute distribution. Tu peux vendre librement
              une partie de tes parts sur le marché public, au prix que tu fixes toi-même.
            </li>
          </ul>
        </section>

        <section id="capital-rachat" className={guideStyles.guideSection}>
          <h2>⚔️ Capital-risque, rachats & prêts entre joueurs</h2>
          <ul className={guideStyles.list}>
            <li>
              <strong>Capital-risque :</strong> finance l'entreprise d'un autre joueur en échange de nouvelles
              parts émises, qui diluent tous les actionnaires existants au prorata. Plusieurs investisseurs
              peuvent se partager un même tour, proportionnellement à leur contribution. Les parts et l'argent
              sont transférés immédiatement à chaque contribution — même si le tour n'est jamais entièrement
              financé et expire, ce qui a déjà été investi reste acquis.
            </li>
            <li>
              <strong>Rachats hostiles (OPA) :</strong> un prix par 1% de parts, au moins 10% au-dessus de la
              valeur comptable, ouvert à TOUS les actionnaires (pas seulement ceux qui voulaient vendre).
            </li>
            <li>
              <strong>Rachats amicaux :</strong> annonce de vente négociée — chaque acheteur potentiel fait une
              offre privée, le vendeur choisit librement laquelle accepter, sans prime minimale imposée.
            </li>
            <li>
              <strong>Prêts entre joueurs (communautaires) :</strong> une entreprise propose un prêt financé par
              sa propre trésorerie, taux et durée fixés librement dans des bornes raisonnables — n'importe quel
              joueur peut l'accepter en premier arrivé, premier servi.
            </li>
          </ul>
        </section>

        <section id="provinces" className={guideStyles.guideSection}>
          <h2>🏛️ Provinces & vie communale</h2>
          <p>
            Les 11 provinces belges ont chacune leur propre profil immobilier et leur propre affinité
            économique historique (ex. métallurgie à Liège/Hainaut, bois en province de Luxembourg) — un bonus
            d'attractivité permanent pour l'entreprise du bon secteur au bon endroit.
          </p>
          <p>
            <strong>Contribuer au fonds d'infrastructure</strong> d'une province a deux effets distincts, partagés
            par toutes les entreprises qui y sont installées, à rendements décroissants :
          </p>
          <ul className={guideStyles.list}>
            <li>Un bonus d'attractivité (une part plus grande d'un marché national partagé).</li>
            <li>
              Un bonus de <strong>clientèle locale</strong> (jusqu'à +50%) — de la demande neuve propre à chaque
              entreprise de la province, qui ne vient du panier d'aucun concurrent.
            </li>
          </ul>
          <p>
            <strong>Conseil communal :</strong> les contributeurs au fonds d'une province peuvent proposer de
            modifier son taux de droits d'enregistrement immobiliers (variation bornée à ±2 points), avec un vote
            pondéré par la contribution cumulée de chacun à cette province précise. Une proposition dure 14 cycles
            et n'est adoptée que si elle réunit une majorité ET au moins 500 de poids de vote cumulé — un petit
            contributeur isolé ne peut rien imposer seul.
          </p>
        </section>

        <section id="portefeuille" className={guideStyles.guideSection}>
          <h2>💼 Portefeuille & récap de cycle</h2>
          <p>
            La page Portefeuille consolide toutes tes positions réelles (liquide, immobilier, entreprises,
            placements, matières premières, épargne, biens personnels) recalculées en direct, avec un graphique
            d'évolution de ton patrimoine net cycle après cycle.
          </p>
          <p>
            Le <strong>récap de cycle</strong>, juste en dessous, détaille précisément ce qui a fait bouger ton
            patrimoine liquide à la dernière clôture — salaire, loyers, dividendes (avec le calcul brut → 30% de
            précompte → net pour chaque entreprise séparément si tu en as plusieurs), échéances de prêt,
            événements de vie, récompenses de défis — plutôt qu'un seul chiffre agrégé. Une section séparée montre
            aussi ce qui s'est accumulé sans toucher au liquide (intérêts capitalisés, dividendes réinvestis en
            parts).
          </p>
        </section>

        <section id="engagement" className={guideStyles.guideSection}>
          <h2>🎯 Défis, prime quotidienne & quiz fiscal</h2>
          <ul className={guideStyles.list}>
            <li>
              <strong>Défis :</strong> 17 jalons ponctuels ou cumulatifs — huit "premières fois" (10 à 150 €
              chacune), et neuf paliers de patrimoine net / profit d'entreprise / niveau de levier (30 à 400 €
              chacun selon le seuil).
            </li>
            <li>
              <strong>Prime de connexion quotidienne :</strong> grandit avec ta série de jours consécutifs — 10 €
              le premier jour, +5 €/jour jusqu'à un plafond de 40 € au 7ᵉ jour et au-delà. Rater un seul jour civil
              remet la série à zéro.
            </li>
            <li>
              <strong>Quiz fiscal :</strong> une question vrai/faux tirée au hasard parmi 48, sur tous les
              aspects du jeu — une nouvelle question possible toutes les 3 minutes. Bonne réponse : 8 €. Mauvaise
              réponse : aucune perte, juste l'explication affichée pour apprendre.
            </li>
          </ul>
        </section>

        <section id="info" className={guideStyles.guideSection}>
          <h2>📰 Classement, presse & prestige</h2>
          <ul className={guideStyles.list}>
            <li>
              <strong>Classement :</strong> 4 classements distincts — patrimoine net, croissance (sur 7/30/90
              cycles), réputation, expérience — toujours publics, recalculés à la demande, sans récompense de
              rang.
            </li>
            <li>
              <strong>Presse économique :</strong> articles générés uniquement pour de vrais événements survenus
              — alerte puis confirmation de crise/boom sectoriel majeur, faillite d'entreprise ou de banque-joueur,
              enchère remportée. Purement informatif.
            </li>
            <li>
              <strong>Immobilier de prestige :</strong> vitrine publique de tes biens LUXURY nommés — voir la
              section Immobilier, aucun effet économique.
            </li>
          </ul>
        </section>

        <section id="dons" className={guideStyles.guideSection}>
          <h2>🎁 Dons</h2>
          <ul className={guideStyles.list}>
            <li>
              <strong>Don entre joueurs :</strong> soumis à 30% de droits de donation (comme un vrai don entre
              personnes sans lien de parenté proche) — le bénéficiaire reçoit 70% du montant envoyé.
            </li>
            <li>
              <strong>Don à une cause reconnue</strong> (4 causes fixes) : aucun droit de donation, et une
              réduction d'impôt immédiate de 45%, plafonnée à 2 000 €/an — nettement plus avantageux fiscalement
              qu'un don à un autre joueur, en échange de ne pas choisir qui en profite.
            </li>
          </ul>
        </section>

        <section id="notifications" className={guideStyles.guideSection}>
          <h2>🔔 Journal de notifications</h2>
          <p>
            Tout ce qui t'arrive automatiquement pendant que tu n'es pas connecté atterrit dans le journal :
            salaire/licenciement, défaut de prêt (hypothécaire ou communautaire), échéance d'assurance, résultat
            d'enchère, offre d'emploi pourvue, entreprise en faillite, dividende de capital-risque, don reçu,
            palier de carrière franchi, défi débloqué, compte d'épargne arrivé à échéance, faillite d'une
            banque-joueur (remboursement total ou partiel de ton dépôt) — de quoi ne rien manquer sans avoir à
            tout vérifier manuellement page par page.
          </p>
        </section>

        <section id="cartels" className={guideStyles.guideSection}>
          <h2>🤝 Cartels (désactivés)</h2>
          <p>
            Les cartels sectoriels (guildes) sont temporairement désactivés : le mécanisme de fixation d'un prix
            plancher commun n'a de sens qu'avec plusieurs vrais concurrents par secteur pour le faire respecter, ce
            qui suppose beaucoup plus de joueurs actifs qu'aujourd'hui. Tout le code et les données restent en
            place en coulisses pour une réactivation future si la communauté grandit.
          </p>
        </section>

        <section id="astuces" className={guideStyles.guideSection}>
          <h2>💡 Astuces stratégiques</h2>
          <ul className={guideStyles.list}>
            <li>
              <strong>Spécialise-toi avant de papillonner.</strong> Changer de secteur (emploi) ou de province
              coûte à chaque fois — l'ancienneté sectorielle et les paliers de carrière ne se rattrapent pas
              instantanément.
            </li>
            <li>
              <strong>Investir en capacité sans investir en demande ne sert à rien</strong> au-delà de ce que le
              marché absorbe déjà — un surplus de production non vendu devient du stock qui coûte cher à garder.
              Regarde ta part de marché avant de mettre plus d'équipement/employés : si tu vends déjà tout ce que
              tu produis à un bon prix, c'est le marketing/l'attractivité qui manquent, pas la capacité.
            </li>
            <li>
              <strong>Le bien-être n'est pas cosmétique.</strong> Sous 30/100, tu perds jusqu'à 25% de tes revenus
              d'emploi silencieusement — si un revenu baisse sans raison apparente, vérifie ce chiffre avant
              d'accuser autre chose.
            </li>
            <li>
              <strong>Diversifie ton patrimoine</strong> entre liquide, immobilier, entreprises et placements — la
              page Portefeuille montre ta répartition réelle ; un patrimoine concentré sur une seule catégorie est
              un vrai risque si elle s'effondre.
            </li>
            <li>
              <strong>La franchise de plus-value est à vie, pas annuelle</strong> — 10 000 € cumulés entre épargne
              ET placements. Vendre stratégiquement plutôt que tout d'un coup ménage cette franchise plus
              longtemps.
            </li>
            <li>
              <strong>Un manager coûte un salaire fixe mais stabilise le moral</strong> et évite la pénalité
              d'attention divisée sur plusieurs entreprises — rentable dès que tu géres plus d'une entreprise ou
              que tu ne peux pas te connecter souvent.
            </li>
            <li>
              <strong>Avant d'investir dans une entreprise ou d'y déposer de l'argent</strong> (capital-risque,
              banque-joueur, prêt communautaire), regarde son ancienneté, son profit cumulé et sa trésorerie —
              c'est ta vraie "due diligence", exactement comme un investisseur réel.
            </li>
            <li>
              <strong>Investir dans ta province profite à toutes tes entreprises qui s'y trouvent</strong>, pas
              seulement celle qui a payé — et profite un peu à tes concurrents locaux aussi. Un effet collectif
              réaliste, pas un raccourci individuel.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
