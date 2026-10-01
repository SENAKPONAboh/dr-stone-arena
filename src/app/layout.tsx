import type { Metadata, Viewport } from "next";
import { Inter, Unbounded, Figtree } from "next/font/google";
import "./globals.css";
import "@/styles/monetise.css";
import "@/styles/boutique-fx.css";
import ThemeProvider from '@/components/ThemeProvider';
import PwaRegistrar from '@/components/PwaRegistrar';
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"] });
const unbounded = Unbounded({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-unbounded", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "Dr. Stone Arena",
  description: "Plateforme intelligente de progression médicale",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Dr. Stone Arena',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  }
};

export const viewport: Viewport = {
  themeColor: "#0d1311",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} ${unbounded.variable} ${figtree.variable}`}>
        <NextTopLoader
          color="#10b981"
          height={4}
          showSpinner={false}
          crawlSpeed={200}
        />
        <ThemeProvider>
          <PwaRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}