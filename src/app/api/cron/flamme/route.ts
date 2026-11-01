// ===== TÂCHE DU SOIR (Vercel Cron, voir vercel.json) : « Ta Flamme va s'éteindre ce soir » =====
// Lancée une fois par jour vers 20 h à Niamey (19 h UTC). Elle :
// 1. éteint en base les Flammes déjà perdues (classements et profils justes, même pour qui n'ouvre plus l'appli) ;
// 2. prévient (cloche + téléphone) ceux qui ont joué hier mais pas encore aujourd'hui. Une seule fois par jour et par personne.
// Sécurité : Vercel envoie « Authorization: Bearer <CRON_SECRET> ». Sans CRON_SECRET configuré, la route refuse tout.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyUser } from '@/lib/notify';
import { flameStatus, persistLostFlame, startOfWatDay } from '@/lib/flame';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FLAME_WARNING_ICON = '🔥';
const WARNING_MARK = "va s'éteindre ce soir";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const now = new Date();
  const todayStart = startOfWatDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { role: 'ETUDIANT', statut: 'VALIDE', streak: { gt: 0 } },
    select: { id: true, streak: true, lastActive: true, flameProtectedUntil: true },
  });

  let extinguished = 0;
  const atRisk: typeof users = [];
  for (const u of users) {
    const status = flameStatus(u, now);
    if (status === 'lost') {
      if (await persistLostFlame(u).catch(() => false)) extinguished++;
    } else if (status === 'atRisk') {
      // Protection qui couvre déjà toute la journée : rien à craindre ce soir
      const protectedToday = u.flameProtectedUntil && new Date(u.flameProtectedUntil) >= tomorrowStart;
      if (!protectedToday) atRisk.push(u);
    }
  }

  // Une seule alerte par jour et par personne (même si la tâche est relancée)
  const already = atRisk.length
    ? await prisma.notification.findMany({
        where: { userId: { in: atRisk.map(u => u.id) }, createdAt: { gte: todayStart }, message: { contains: WARNING_MARK } },
        select: { userId: true },
      })
    : [];
  const done = new Set(already.map(n => n.userId));
  const targets = atRisk.filter(u => !done.has(u.id));

  for (let i = 0; i < targets.length; i += 20) {
    await Promise.all(targets.slice(i, i + 20).map(u =>
      notifyUser(
        u.id,
        `Ta Flamme de ${u.streak} jour${u.streak > 1 ? 's' : ''} ${WARNING_MARK} ! Un seul cas avant minuit suffit pour la garder.`,
        FLAME_WARNING_ICON,
        { title: '🔥 Ta Flamme est en danger', url: '/etudiant/challenge' },
      ).catch(e => console.error('Alerte Flamme :', e)),
    ));
  }

  return NextResponse.json({ ok: true, extinguished, warned: targets.length, alreadyWarned: done.size });
}
