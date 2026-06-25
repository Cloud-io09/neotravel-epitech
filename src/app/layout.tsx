import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoTravel MVP",
  description: "Parcours prospect minimal pour devis transport de groupe",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
