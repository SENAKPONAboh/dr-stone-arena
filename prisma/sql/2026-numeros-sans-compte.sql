-- Libère les numéros WhatsApp restés enregistrés alors que leur compte a été supprimé
-- (la table "UserPhone" n'a pas de lien automatique vers "User" : le numéro restait bloqué).
-- Seules les lignes dont le compte n'existe plus sont effacées ; aucun compte existant n'est touché.
-- Au 31/10/2026 : une seule ligne concernée (+22790016284).
-- Rejouable sans casse : au 2e passage il n'y a plus rien à effacer.
-- À exécuter UNE fois : terminal de VS Code, dossier dr-stone-arena :
--   npx.cmd prisma db execute --file prisma/sql/2026-numeros-sans-compte.sql

DELETE FROM "UserPhone" ph
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = ph."userId");
