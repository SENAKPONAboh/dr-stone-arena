import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from '@/components/ThemeProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dr. Stone Arena",
  description: "Plateforme intelligente de progression médicale",
  manifest: "/manifest.json", // <-- AJOUT
};

export const viewport: Viewport = {
  themeColor: "#10b981", // <-- AJOUT (couleur de la barre de statut du téléphone)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}