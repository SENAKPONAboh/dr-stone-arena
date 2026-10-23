-- Numéro WhatsApp des étudiants : nouvelle table "UserPhone" (additif, aucune donnée existante n'est touchée).
-- Un numéro ne peut servir qu'à un seul compte (index unique sur "phone").
-- À exécuter UNE fois, dans le terminal de VS Code (dossier dr-stone-arena) :
--   npx.cmd prisma db execute --file prisma/sql/2026-numero-whatsapp.sql
-- Rejouable sans casse.

CREATE TABLE IF NOT EXISTS "UserPhone" (
  "userId"     TEXT         NOT NULL,
  "phone"      TEXT         NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPhone_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPhone_phone_key" ON "UserPhone"("phone");
