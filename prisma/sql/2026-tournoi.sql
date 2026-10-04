-- Tournoi mensuel : deux nouvelles tables (additif, aucune donnée existante n'est touchée).
-- À exécuter UNE fois (le reste de l'application fonctionne sans, seule la page Tournoi les demande) :
--   npx.cmd prisma db execute --file prisma/sql/2026-tournoi.sql

CREATE TABLE IF NOT EXISTS "Tournament" (
  "id"         TEXT         NOT NULL,
  "season"     TEXT         NOT NULL,
  "anneeEtude" INTEGER      NOT NULL,
  "title"      TEXT         NOT NULL,
  "status"     TEXT         NOT NULL DEFAULT 'BROUILLON',
  "caseIds"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "opensAt"    TIMESTAMP(3) NOT NULL,
  "closesAt"   TIMESTAMP(3) NOT NULL,
  "prize"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tournament_season_anneeEtude_key" ON "Tournament"("season", "anneeEtude");

CREATE TABLE IF NOT EXISTS "TournamentEntry" (
  "id"            TEXT         NOT NULL,
  "tournamentId"  TEXT         NOT NULL,
  "userId"        TEXT         NOT NULL,
  "seed"          INTEGER      NOT NULL,
  "currentIndex"  INTEGER      NOT NULL DEFAULT 0,
  "caseStartedAt" TIMESTAMP(3),
  "startedAt"     TIMESTAMP(3),
  "finishedAt"    TIMESTAMP(3),
  "score"         INTEGER      NOT NULL DEFAULT 0,
  "totalTime"     INTEGER      NOT NULL DEFAULT 0,
  "answers"       JSONB        NOT NULL DEFAULT '[]',
  "rank"          INTEGER,
  CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TournamentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TournamentEntry_tournamentId_userId_key" ON "TournamentEntry"("tournamentId", "userId");
CREATE INDEX IF NOT EXISTS "TournamentEntry_userId_idx" ON "TournamentEntry"("userId");
