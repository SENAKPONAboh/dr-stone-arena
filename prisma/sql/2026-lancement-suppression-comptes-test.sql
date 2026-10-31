-- LANCEMENT : supprime DÉFINITIVEMENT tous les comptes de test, sauf les comptes ADMIN et ceux listés ci-dessous.
-- Pour chaque compte supprimé, tout ce qui lui appartient part avec lui : tentatives, duels, messages, amitiés,
-- notifications, badges, reçus Premium / Pass / recharge, retraits, UA, boutique, Rush, saisons, tournoi,
-- numéro WhatsApp, profil ambassadeur (et ses commissions). Les comptes gardés perdent seulement
-- les duels, messages et amitiés qu'ils avaient avec un compte supprimé, et leur lien « parrainé par »
-- s'il pointait vers un ambassadeur supprimé.
-- Rien d'autre n'est touché : banque de cas, matières, moyens de paiement, boutique, dépenses.
--
-- ORDRE : 1) sauvegarde   npm.cmd run sauvegarde
--         2) aperçu       node scripts/apercu-comptes-lancement.mjs   (lecture seule, à relire)
--         3) ce fichier   npx.cmd prisma db execute --file prisma/sql/2026-lancement-suppression-comptes-test.sql
-- (terminal de VS Code, dossier dr-stone-arena)
--
-- GARDE-FOUS : le script s'arrête SANS RIEN SUPPRIMER si un compte listé est introuvable (faute de frappe),
-- si un pseudo correspond à plusieurs comptes, s'il ne resterait aucun ADMIN, ou si un compte à supprimer
-- a été créé après la date limite (vrai étudiant inscrit au lancement). Tout se fait en une seule transaction :
-- soit tout passe, soit rien ne change.
-- Rejouable sans casse le même jour (au 2e passage il n'y a plus rien à supprimer),
-- mais À NE PLUS LANCER après l'ouverture des inscriptions.

BEGIN;

CREATE TEMP TABLE "_garder" ("ident" TEXT NOT NULL) ON COMMIT DROP;

-- Comptes à garder : un e-mail (conseillé) ou un pseudo par ligne, entre apostrophes, séparés par des virgules.
-- Les comptes ADMIN sont toujours gardés, inutile de les écrire.
INSERT INTO "_garder" ("ident") VALUES
-- >>> COMPTES A GARDER (début)
  ('A_REMPLACER')
-- <<< COMPTES A GARDER (fin)
;

DO $$
DECLARE
  -- Date limite : tout compte créé à partir de ce moment est considéré comme un vrai étudiant (2 nov. 2026, 0 h à Niamey).
  date_limite CONSTANT TIMESTAMP := TIMESTAMP '2026-11-01 23:00:00'; -- en UTC
  ident_seul  TEXT;
  nb          INT;
BEGIN
  IF EXISTS (SELECT 1 FROM "_garder" WHERE "ident" = 'A_REMPLACER') THEN
    RAISE EXCEPTION 'Liste des comptes a garder pas encore remplie : rien n a ete supprime.';
  END IF;

  -- Chaque compte listé doit correspondre à exactement un compte
  FOR ident_seul IN SELECT "ident" FROM "_garder" LOOP
    SELECT count(*) INTO nb FROM "User" u
     WHERE lower(trim(u."email")) = lower(trim(ident_seul))
        OR lower(trim(coalesce(u."pseudo", ''))) = lower(trim(ident_seul));
    IF nb = 0 THEN
      RAISE EXCEPTION 'Compte a garder introuvable : % (faute de frappe ?). Rien n a ete supprime.', ident_seul;
    ELSIF nb > 1 THEN
      RAISE EXCEPTION 'Plusieurs comptes correspondent a : % (ecris plutot son e-mail). Rien n a ete supprime.', ident_seul;
    END IF;
  END LOOP;

  -- Comptes à supprimer
  CREATE TEMP TABLE "_suppr" ON COMMIT DROP AS
  SELECT u."id", u."createdAt" FROM "User" u
   WHERE u."role" <> 'ADMIN'
     AND NOT EXISTS (
       SELECT 1 FROM "_garder" g
        WHERE lower(trim(u."email")) = lower(trim(g."ident"))
           OR lower(trim(coalesce(u."pseudo", ''))) = lower(trim(g."ident")));

  IF NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN') THEN
    RAISE EXCEPTION 'Aucun compte ADMIN trouve : arret par securite. Rien n a ete supprime.';
  END IF;

  SELECT count(*) INTO nb FROM "_suppr" WHERE "createdAt" >= date_limite;
  IF nb > 0 THEN
    RAISE EXCEPTION '% compte(s) a supprimer ont ete crees apres la date limite (vrais etudiants ?). Rien n a ete supprime.', nb;
  END IF;

  CREATE TEMP TABLE "_suppr_amb" ON COMMIT DROP AS
  SELECT a."id" FROM "Ambassador" a WHERE a."userId" IN (SELECT "id" FROM "_suppr");

  -- Tables ajoutées à la main (sans lien automatique vers User) : on vérifie qu'elles existent
  IF to_regclass('"UserPhone"') IS NOT NULL THEN
    EXECUTE 'DELETE FROM "UserPhone" WHERE "userId" IN (SELECT "id" FROM "_suppr")';
  END IF;
  IF to_regclass('"AmbassadorPanelAccess"') IS NOT NULL THEN
    EXECUTE 'DELETE FROM "AmbassadorPanelAccess" WHERE "ambassadorId" IN (SELECT "id" FROM "_suppr_amb")';
  END IF;
  IF to_regclass('"SeasonResult"') IS NOT NULL THEN
    EXECUTE 'DELETE FROM "SeasonResult" WHERE "userId" IN (SELECT "id" FROM "_suppr")';
  END IF;
  IF to_regclass('"TournamentEntry"') IS NOT NULL THEN
    EXECUTE 'DELETE FROM "TournamentEntry" WHERE "userId" IN (SELECT "id" FROM "_suppr")';
  END IF;

  -- Ambassadeurs supprimés : commissions, versements, et lien « parrainé par » des comptes gardés
  DELETE FROM "AmbassadorCommission"
   WHERE "userId" IN (SELECT "id" FROM "_suppr")
      OR "ambassadorId" IN (SELECT "id" FROM "_suppr_amb")
      OR "premiumRequestId" IN (SELECT "id" FROM "PremiumRequest" WHERE "userId" IN (SELECT "id" FROM "_suppr"));
  DELETE FROM "AmbassadorPayout" WHERE "ambassadorId" IN (SELECT "id" FROM "_suppr_amb");
  UPDATE "User" SET "referredById" = NULL WHERE "referredById" IN (SELECT "id" FROM "_suppr_amb");
  DELETE FROM "Ambassador" WHERE "id" IN (SELECT "id" FROM "_suppr_amb");

  -- Liens entre deux comptes (si l'un des deux est supprimé)
  DELETE FROM "Duel"          WHERE "requesterId" IN (SELECT "id" FROM "_suppr") OR "opponentId"  IN (SELECT "id" FROM "_suppr");
  DELETE FROM "Friendship"    WHERE "requesterId" IN (SELECT "id" FROM "_suppr") OR "addresseeId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "DirectMessage" WHERE "senderId"    IN (SELECT "id" FROM "_suppr") OR "recipientId" IN (SELECT "id" FROM "_suppr");

  -- Données personnelles du compte
  DELETE FROM "Attempt"            WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "MonetiseAttempt"    WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "DailyCaseSelection" WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "MonetiseSelection"  WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "UserBadge"          WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "Notification"       WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "ArenaRewardClaim"   WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "PremiumRequest"     WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "PassRequest"        WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "RechargeRequest"    WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "WithdrawalRequest"  WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "UaTransaction"      WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "RushSession"        WHERE "userId" IN (SELECT "id" FROM "_suppr");
  DELETE FROM "UserInventory"      WHERE "userId" IN (SELECT "id" FROM "_suppr");

  -- Enfin les comptes eux-mêmes (tout oubli éventuel part aussi, par cascade)
  DELETE FROM "User" WHERE "id" IN (SELECT "id" FROM "_suppr");
END $$;

COMMIT;
