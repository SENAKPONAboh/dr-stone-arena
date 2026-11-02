-- Lie le numéro WhatsApp à son compte : quand un compte est supprimé (panel, SQL ou Supabase),
-- son numéro est effacé automatiquement par la base et redevient libre pour une nouvelle inscription.
-- 1) efface d'abord les numéros dont le compte n'existe déjà plus (sinon le lien ne peut pas être créé) ;
--    aucun compte existant ni son numéro n'est touché.
-- 2) ajoute le lien « suppression en cascade » entre "UserPhone" et "User".
-- Rejouable sans casse : au 2e passage il n'y a plus rien à effacer et le lien existe déjà.
-- À exécuter UNE fois : terminal de VS Code, dossier dr-stone-arena :
--   npx.cmd prisma db execute --file prisma/sql/2026-11-02-numero-lie-au-compte.sql

DELETE FROM "UserPhone" ph
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = ph."userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserPhone_userId_fkey') THEN
    ALTER TABLE "UserPhone"
      ADD CONSTRAINT "UserPhone_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
