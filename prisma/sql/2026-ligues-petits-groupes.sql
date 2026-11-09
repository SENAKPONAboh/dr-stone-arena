-- Ligues, semaine du 9 novembre : rattache les joueurs des tout petits groupes (moins de 6) au groupe 1 de leur ligue.
-- Leurs points ne changent pas : ils rejoignent seulement le vrai groupe (aujourd'hui : le groupe Argent 2, 3 joueurs).
-- À exécuter UNE fois, dans le terminal de VS Code (dossier dr-stone-arena) :
--   npx.cmd prisma db execute --file prisma/sql/2026-ligues-petits-groupes.sql
-- Rejouable sans casse (ne touche que les groupes de moins de 6 joueurs de cette semaine).
UPDATE "LeagueMember" m
SET "groupNo" = 1, "updatedAt" = NOW()
WHERE m."week" = '2026-11-09'
  AND m."groupNo" > 1
  AND (SELECT COUNT(*) FROM "LeagueMember" x WHERE x."week" = m."week" AND x."tier" = m."tier" AND x."groupNo" = m."groupNo") < 6;
