-- Panne du 16 novembre 2026 (Vercel en pause, puis déménagement vers drstonearena.com) :
-- personne n'a pu jouer ce jour-là, donc les joueurs qui avaient une Flamme risquent de la perdre
-- alors que ce n'est pas leur faute.
-- Ce fichier donne une PROTECTION de Flamme (comme le Gel de la boutique) jusqu'au jeudi 19 novembre
-- à minuit (heure de Niamey) à tous les étudiants qui avaient une Flamme active et qui ont joué
-- le 15 ou le 16 novembre. Ils ont jusqu'à jeudi soir pour revenir sur la nouvelle adresse sans rien perdre.
-- Seule la colonne "flameProtectedUntil" change. Les XP, Flammes, grades, UA et paiements ne bougent pas.
-- Une protection déjà plus longue (achetée en boutique) est gardée telle quelle.
-- Rejouable sans risque (le refaire ne change rien de plus).
-- À exécuter UNE fois, dans le terminal de VS Code (dossier dr-stone-arena) :
--   npx.cmd prisma db execute --file prisma/sql/2026-11-17-protection-flamme-panne.sql

UPDATE "User"
SET "flameProtectedUntil" = GREATEST(COALESCE("flameProtectedUntil", TIMESTAMP '2026-11-19 23:00:00'), TIMESTAMP '2026-11-19 23:00:00')
WHERE "role" = 'ETUDIANT'
  AND "streak" > 0
  AND "lastActive" >= TIMESTAMP '2026-11-14 23:00:00';
