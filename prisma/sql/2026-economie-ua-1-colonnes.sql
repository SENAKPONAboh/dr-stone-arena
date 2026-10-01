-- ÉTAPE 1 — Ajout des colonnes (additif, sans risque : valeur par défaut 0).
-- À exécuter dans l'éditeur SQL de Supabase du projet de PRODUCTION, AVANT de déployer le nouveau code.
-- Le code actuel continue de fonctionner normalement avec ces colonnes en plus.
-- (Jamais `prisma db push` : on applique ce SQL explicite.)

ALTER TABLE "User"          ADD COLUMN IF NOT EXISTS "uaRecharged"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UaTransaction" ADD COLUMN IF NOT EXISTS "rechargedDelta" INTEGER NOT NULL DEFAULT 0;

-- Contrôle :
-- SELECT column_name FROM information_schema.columns
--  WHERE (table_name = 'User' AND column_name = 'uaRecharged')
--     OR (table_name = 'UaTransaction' AND column_name = 'rechargedDelta');
