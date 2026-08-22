import Link from "next/link";
import styles from "./page.module.css";

const NAV_LINKS = [
  { href: "/classement", label: "🏆 Classement", primary: true },
  { href: "/notifications", label: "🔔 Journal", primary: false },
  { href: "/bien-etre", label: "💗 Bien-être", primary: false },
  { href: "/epargne", label: "🐷 Épargne", primary: false },
  { href: "/pret-communautaire", label: "🏦 Prêts entre joueurs", primary: false },
  { href: "/immobilier", label: "🏘️ Immobilier", primary: false },
  { href: "/bourse", label: "💹 Bourse", primary: false },
  { href: "/placements", label: "📈 Placements", primary: false },
  { href: "/guildes", label: "🤝 Cartels", primary: false },
  { href: "/dons", label: "🎁 Dons", primary: false },
  { href: "/market", label: "📊 Marché des parts", primary: false },
  { href: "/rachat", label: "⚔️ Rachats hostiles", primary: false },
  { href: "/rachat-amical", label: "🤝 Rachats amicaux", primary: false },
  { href: "/capital-risque", label: "💰 Capital-risque", primary: false },
  { href: "/prestige", label: "🏰 Immobilier de prestige", primary: false },
  { href: "/provinces", label: "🏛️ Provinces", primary: false },
  { href: "/presse", label: "📰 Presse économique", primary: false },
] as const;

export function MainNav({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <nav className={styles.mainNav}>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={link.primary ? `${styles.mainNavLink} ${styles.cardGold}` : styles.mainNavLink}
        >
          {link.label}
          {link.href === "/notifications" && unreadCount > 0 && (
            <span className={styles.rankBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
