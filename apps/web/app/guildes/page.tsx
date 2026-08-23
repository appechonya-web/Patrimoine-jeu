import { redirect } from "next/navigation";

// Désactivé (pas supprimé) : les cartels n'ont de sens qu'avec plusieurs
// concurrents joueurs par secteur (un vrai oligopole) — trop peu probable
// pour l'échelle actuelle du groupe. Le code (domaine, moteur de jeu, API)
// et les données restent intacts ; il suffit de restaurer ce fichier et le
// lien dans main-nav.tsx pour réactiver la fonctionnalité.
export default function GuildesPage() {
  redirect("/");
}
