-- Dédommagement de la panne du 16 novembre 2026 (Vercel en pause, puis déménagement vers drstonearena.com).
-- Décidé par Arthur le 17 novembre 2026. Trois choses, dans une seule transaction (tout passe ou rien ne passe) :
--
--  1) FLAMMES RENDUES : ceux qui avaient joué le 15 ou le 16 novembre et dont la Flamme est déjà repartie à 1
--     (parce qu'ils ont rejoué après la coupure) retrouvent leur ancienne Flamme (+ le jour joué depuis).
--  2) FLAMMES PROTÉGÉES : tous les étudiants qui avaient une Flamme active le 15 ou le 16 novembre reçoivent
--     une protection (comme le Gel de la boutique) jusqu'au jeudi 19 novembre à minuit, heure de Niamey.
--     Une protection déjà plus longue (achetée en boutique) est gardée.
--  3) CADEAU : 2 000 UA de BOUTIQUE à chaque étudiant validé (LeagueProfile.ua, jamais retirables en argent),
--     avec une ligne d'historique « AUTRE / DEDOMMAGEMENT_PANNE_2026_11_16 ».
--     Ceux qui n'ont pas encore de profil de ligue en reçoivent un, avec la même ligue de départ que l'appli
--     (XP ≥ 1 000 → Or, ≥ 500 → Argent, sinon Bronze, dans la limite des ligues ouvertes).
--
-- Rien d'autre ne change : XP, grades, solde Élite (uaBalance), retraits et paiements ne sont pas touchés.
-- Rejouable sans risque : le cadeau n'est jamais donné deux fois à la même personne, et les Flammes ne
-- sont rendues qu'une fois (la marque de perte est effacée après restitution).
--
-- À exécuter UNE fois, dans le terminal de VS Code (dossier dr-stone-arena) :
--   npx.cmd prisma db execute --file prisma/sql/2026-11-17-protection-flamme-panne.sql

BEGIN;

-- 1) Flammes rendues (perdues à partir du 16 novembre, chez des joueurs qui avaient joué le 15 ou le 16)
UPDATE "User" u
SET "streak" = u."streakBeforeReset" + GREATEST(u."streak", 0),
    "streakBeforeReset" = 0,
    "flameLostAt" = NULL
WHERE u."role" = 'ETUDIANT'
  AND u."streakBeforeReset" > 0
  AND u."flameLostAt" >= TIMESTAMP '2026-11-15 23:00:00'
  AND (
    EXISTS (SELECT 1 FROM "Attempt" a WHERE a."userId" = u."id"
            AND a."createdAt" >= TIMESTAMP '2026-11-14 23:00:00' AND a."createdAt" < TIMESTAMP '2026-11-16 23:00:00')
    OR EXISTS (SELECT 1 FROM "MonetiseAttempt" m WHERE m."userId" = u."id"
            AND m."createdAt" >= TIMESTAMP '2026-11-14 23:00:00' AND m."createdAt" < TIMESTAMP '2026-11-16 23:00:00')
  );

-- 2) Flammes protégées jusqu'au jeudi 19 novembre minuit (Niamey) = 2026-11-19 23:00 UTC
UPDATE "User"
SET "flameProtectedUntil" = GREATEST(COALESCE("flameProtectedUntil", TIMESTAMP '2026-11-19 23:00:00'), TIMESTAMP '2026-11-19 23:00:00')
WHERE "role" = 'ETUDIANT'
  AND "streak" > 0
  AND "lastActive" >= TIMESTAMP '2026-11-14 23:00:00';

-- 3a) Profil de ligue pour ceux qui n'en ont pas encore (même ligue de départ que l'appli)
INSERT INTO "LeagueProfile" ("userId", "tier")
SELECT u."id",
       LEAST(
         (SELECT COALESCE(
                   (SELECT LEAST(6, GREATEST(1, s."value"::int)) FROM "LeagueSetting" s
                     WHERE s."key" = 'openTiers' AND s."value" ~ '^[0-9]+$'),
                   3)) - 1,
         CASE WHEN u."xp" >= 1000 THEN 2 WHEN u."xp" >= 500 THEN 1 ELSE 0 END
       )
FROM "User" u
WHERE u."role" = 'ETUDIANT' AND u."statut" = 'VALIDE'
ON CONFLICT ("userId") DO NOTHING;

-- 3b + 3c) Cadeau : ligne d'historique puis crédit des 2 000 UA, une seule fois par personne
WITH nouveaux AS (
  INSERT INTO "UaLedger" ("id", "userId", "amount", "reason", "reference")
  SELECT gen_random_uuid()::text, u."id", 2000, 'AUTRE', 'DEDOMMAGEMENT_PANNE_2026_11_16'
  FROM "User" u
  WHERE u."role" = 'ETUDIANT' AND u."statut" = 'VALIDE'
    AND NOT EXISTS (SELECT 1 FROM "UaLedger" l WHERE l."userId" = u."id" AND l."reference" = 'DEDOMMAGEMENT_PANNE_2026_11_16')
  RETURNING "userId"
)
UPDATE "LeagueProfile" p
SET "ua" = p."ua" + 2000, "updatedAt" = now()
FROM nouveaux n
WHERE p."userId" = n."userId";

COMMIT;
