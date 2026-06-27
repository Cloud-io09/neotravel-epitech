import type { ReactNode } from "react";
import { GlobalTranslator } from "@/shared/i18n/GlobalTranslator";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
 return (
  <html lang="fr">
   <body>
    <a className="skip-link" href="#main">
     Aller au contenu principal
    </a>
    {children}
    <GlobalTranslator />
   </body>
  </html>
 );
}
