-- Ligues de la semaine : 4 nouvelles tables (additif, aucune donnée existante n'est touchée).
-- À exécuter UNE fois, dans le terminal de VS Code (dossier dr-stone-arena) :
--   npx.cmd prisma db execute --file prisma/sql/2026-ligues.sql
-- Rejouable sans casse (IF NOT EXISTS partout).

-- Ligue actuelle de chaque étudiant (0 Bronze, 1 Argent, 2 Or, 3 Saphir, 4 Rubis, 5 Diamant) + étoiles
CREATE TABLE IF NOT EXISTS "LeagueProfile" (
  "userId"    TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "tier"      INTEGER NOT NULL DEFAULT 0,
  "stars"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Participation d'un étudiant à UNE semaine de ligue (points remis à 0 chaque lundi)
CREATE TABLE IF NOT EXISTS "LeagueMember" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "week"          TEXT NOT NULL,              -- lundi de la semaine, heure de Niamey : "2026-11-09"
  "tier"          INTEGER NOT NULL,
  "groupNo"       INTEGER NOT NULL,
  "points"        INTEGER NOT NULL DEFAULT 0,
  "overtakeDay"   TEXT,                       -- anti-spam des alertes « t'a dépassé »
  "overtakeCount" INTEGER NOT NULL DEFAULT 0,
  "rank"          INTEGER,                    -- rang final (rempli à la clôture du dimanche)
  "result"        TEXT,                       -- MONTE | RESTE | DESCEND | ETOILE
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LeagueMember_userId_week_key" ON "LeagueMember"("userId", "week");
CREATE INDEX IF NOT EXISTS "LeagueMember_week_tier_groupNo_idx" ON "LeagueMember"("week", "tier", "groupNo");

-- Duels déjà comptés pour la ligue (un duel ne rapporte qu'une fois, 1 par adversaire et par semaine)
CREATE TABLE IF NOT EXISTS "LeagueDuelCredit" (
  "duelId"     TEXT NOT NULL,
  "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "opponentId" TEXT NOT NULL,
  "week"       TEXT NOT NULL,
  "day"        TEXT NOT NULL,                 -- jour à l'heure de Niamey : "2026-11-09"
  "points"     INTEGER NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("duelId", "userId")
);
CREATE INDEX IF NOT EXISTS "LeagueDuelCredit_userId_day_idx" ON "LeagueDuelCredit"("userId", "day");

-- Réglages des ligues (ex. « openTiers » = nombre de ligues ouvertes, 3 au départ : Bronze, Argent, Or)
CREATE TABLE IF NOT EXISTS "LeagueSetting" (
  "key"   TEXT PRIMARY KEY,
  "value" TEXT NOT NULL
);
INSERT INTO "LeagueSetting" ("key", "value") VALUES ('openTiers', '3') ON CONFLICT ("key") DO NOTHING;
