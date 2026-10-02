-- Saisons mensuelles : une ligne par étudiant et par mois clôturé (additif, aucune donnée existante n'est touchée).
-- À exécuter AVANT d'utiliser « Clôturer la saison » dans le panel admin :
--   npx.cmd prisma db execute --file prisma/sql/2026-saisons.sql

CREATE TABLE IF NOT EXISTS "SeasonResult" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "season"     TEXT        NOT NULL,
  "xp"         INTEGER     NOT NULL,
  "gradeIndex" INTEGER     NOT NULL,
  "rank"       INTEGER     NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeasonResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeasonResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SeasonResult_userId_season_key" ON "SeasonResult"("userId", "season");
CREATE INDEX IF NOT EXISTS "SeasonResult_season_idx" ON "SeasonResult"("season");
