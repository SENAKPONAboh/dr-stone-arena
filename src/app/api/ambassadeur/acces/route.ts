import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { PANEL_COOKIE, PANEL_HOURS, PANEL_MAX_FAILS, PANEL_LOCK_MINUTES, PANEL_MIN_LENGTH, createPanelToken, hasPanelCookie } from '@/lib/ambassador-panel';

// Mot de passe du panel ambassadeur : créer / saisir / changer / verrouiller.
export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ambassador = await prisma.ambassador.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
  if (!ambassador || ambassador.status !== 'ACTIF') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }
  const action = body?.action;
  const password = typeof body?.password === 'string' ? body.password : '';
  const current = typeof body?.current === 'string' ? body.current : '';

  const setCookie = async (res: NextResponse) => {
    res.cookies.set(PANEL_COOKIE, await createPanelToken(user.id, ambassador.id), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: PANEL_HOURS * 3600,
    });
    return res;
  };

  try {
    const row = await prisma.ambassadorPanelAccess.findUnique({ where: { ambassadorId: ambassador.id } });

    if (action === 'lock') {
      const res = NextResponse.json({ success: true });
      res.cookies.set(PANEL_COOKIE, '', { path: '/', maxAge: 0 });
      return res;
    }

    // Création : seulement s'il n'existe pas encore (sinon il faut passer par « change »)
    if (action === 'set') {
      if (row) return NextResponse.json({ error: 'Un mot de passe existe déjà.' }, { status: 400 });
      if (password.length < PANEL_MIN_LENGTH) return NextResponse.json({ error: `Au moins ${PANEL_MIN_LENGTH} caractères.` }, { status: 400 });
      await prisma.ambassadorPanelAccess.create({ data: { ambassadorId: ambassador.id, passwordHash: await bcrypt.hash(password, 10) } });
      return setCookie(NextResponse.json({ success: true }));
    }

    if (!row) return NextResponse.json({ error: 'Aucun mot de passe défini.' }, { status: 400 });

    // Saisie / changement : on vérifie le mot de passe actuel, avec blocage après trop d'erreurs
    if (action === 'unlock' || action === 'change') {
      if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
        const mins = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000);
        return NextResponse.json({ error: `Trop d'essais. Réessaie dans ${mins} min.` }, { status: 429 });
      }
      const given = action === 'unlock' ? password : current;
      const ok = given.length > 0 && await bcrypt.compare(given, row.passwordHash);
      if (!ok) {
        const fails = row.failedCount + 1;
        const lock = fails >= PANEL_MAX_FAILS;
        await prisma.ambassadorPanelAccess.update({
          where: { ambassadorId: ambassador.id },
          data: { failedCount: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + PANEL_LOCK_MINUTES * 60000) : null },
        });
        return NextResponse.json({ error: lock ? `Trop d'essais. Bloqué ${PANEL_LOCK_MINUTES} min.` : 'Mot de passe incorrect.' }, { status: 401 });
      }

      if (action === 'change') {
        if (password.length < PANEL_MIN_LENGTH) return NextResponse.json({ error: `Au moins ${PANEL_MIN_LENGTH} caractères.` }, { status: 400 });
        await prisma.ambassadorPanelAccess.update({ where: { ambassadorId: ambassador.id }, data: { passwordHash: await bcrypt.hash(password, 10), failedCount: 0, lockedUntil: null } });
      } else if (row.failedCount > 0 || row.lockedUntil) {
        await prisma.ambassadorPanelAccess.update({ where: { ambassadorId: ambassador.id }, data: { failedCount: 0, lockedUntil: null } });
      }
      return setCookie(NextResponse.json({ success: true }));
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Le mot de passe du panel n'est pas encore activé sur le serveur." }, { status: 503 });
  }
}
