-- Mot de passe d'accès au panel ambassadeur : une nouvelle table (additif, aucune donnée existante n'est touchée).
-- À exécuter UNE fois (tant que ce n'est pas fait, le panel ambassadeur reste accessible sans ce mot de passe) :
--   npx.cmd prisma db execute --file prisma/sql/2026-acces-ambassadeur.sql

CREATE TABLE IF NOT EXISTS "AmbassadorPanelAccess" (
  "ambassadorId" TEXT         NOT NULL,
  "passwordHash" TEXT         NOT NULL,
  "failedCount"  INTEGER      NOT NULL DEFAULT 0,
  "lockedUntil"  TIMESTAMP(3),
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AmbassadorPanelAccess_pkey" PRIMARY KEY ("ambassadorId")
);
