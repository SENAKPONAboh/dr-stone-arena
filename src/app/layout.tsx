import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeProvider from '@/components/ThemeProvider';
import PwaRegistrar from '@/components/PwaRegistrar';
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dr. Stone Arena",
  description: "Plateforme intelligente de progression médicale",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dr. Stone Arena',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  }
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
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