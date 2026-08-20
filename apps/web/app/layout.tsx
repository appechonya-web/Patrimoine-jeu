import "./globals.css";
import { HelpProvider } from "../lib/help-context";
import { HelpToggle } from "./help-toggle";

export const metadata = {
  title: "Patrimoine Jeu",
  description: "Jeu de gestion de patrimoine ancré dans la fiscalité belge",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👑</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <HelpProvider>
          {children}
          <HelpToggle />
        </HelpProvider>
      </body>
    </html>
  );
}
