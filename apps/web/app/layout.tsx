export const metadata = {
  title: "Patrimoine Jeu",
  description: "Jeu de gestion de patrimoine ancré dans la fiscalité belge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
