-- UA de la boutique (ligues) : solde SÉPARÉ de l'Espace Élite, jamais retirable en argent (additif, aucune donnée existante n'est touchée).
-- À exécuter UNE fois, dans le terminal de VS Code (dossier dr-stone-arena) :
--   npx.cmd prisma db execute --file prisma/sql/2026-ligues-ua.sql
-- Rejouable sans casse.

-- Solde UA de boutique + coffre en attente d'ouverture + coffre Premium du mois déjà reçu
ALTER TABLE "LeagueProfile" ADD COLUMN IF NOT EXISTS "ua" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeagueProfile" ADD COLUMN IF NOT EXISTS "chestUa" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeagueProfile" ADD COLUMN IF NOT EXISTS "chestLabel" TEXT;
ALTER TABLE "LeagueProfile" ADD COLUMN IF NOT EXISTS "premiumUaMonth" TEXT;

-- Historique des UA de boutique (gains et achats)
CREATE TABLE IF NOT EXISTS "UaLedger" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "amount"    INTEGER NOT NULL,
  "reason"    TEXT NOT NULL,              -- MONTEE | ETOILE | DUEL | PREMIUM | ACHAT | AUTRE
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "UaLedger_userId_createdAt_idx" ON "UaLedger"("userId", "createdAt");
