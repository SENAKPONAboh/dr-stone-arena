-- Invitations contre des vies : chaque ami invité qui s'inscrit puis joue son 1er cas donne +3 vies à celui qui l'a invité.
-- Crée 2 NOUVELLES tables, ne modifie aucune donnée existante. Rejouable sans casse (IF NOT EXISTS).
-- Avant ce SQL, l'application fonctionne déjà : le bouton d'invitation ne s'affiche simplement pas.
-- À exécuter UNE fois : terminal de VS Code, dossier dr-stone-arena :
--   npx.cmd prisma db execute --file prisma/sql/2026-11-23-invitations-vies.sql

CREATE TABLE IF NOT EXISTS "InviteCode" (
  "userId"    TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "code"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InviteCode_code_key" ON "InviteCode"("code");

CREATE TABLE IF NOT EXISTS "LifeInvite" (
  "id"         TEXT PRIMARY KEY,
  "inviterId"  TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "inviteeId"  TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rewardedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LifeInvite_inviteeId_key" ON "LifeInvite"("inviteeId");
CREATE INDEX IF NOT EXISTS "LifeInvite_inviterId_idx" ON "LifeInvite"("inviterId");
