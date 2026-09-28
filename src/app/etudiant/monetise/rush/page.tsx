import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import RushStartPanel from '@/components/monetise/RushStartPanel';
import RushClient from '@/components/monetise/RushClient';
import { getRushState } from '@/lib/monetise-rush';
import { getWeekendId } from '@/lib/monetise';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function infoScreen(emoji: string, title: string, text: string) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="text-center bg-white/5 border border-yellow-500/20 p-8 rounded-3xl max-w-md w-full">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-yellow-300 mb-2">{title}</h2>
        <p className="text-white/50 mb-6">{text}</p>
        <a href="/etudiant/monetise" className="inline-block py-3 px-6 bg-yellow-500 text-[#1a1308] font-bold rounded-2xl">Retour au dashboard</a>
      </div>
    </div>
  );
}

const RECAP = {
  TERMINE_P3: { emoji: '🏆', label: 'Palier 3 — tentative parfaite', color: 'text-yellow-300' },
  TERMINE_ECHEC: { emoji: '💀', label: 'Rush terminé (4 erreurs)', color: 'text-red-300' },
  TERMINE_PLAFOND: { emoji: '📊', label: 'Plafond du week-end atteint', color: 'text-amber-300' },
  TERMINE_ABANDON: { emoji: '⏸️', label: 'Tentative abandonnée', color: 'text-white/50' },
} as const;

export default async function MonetiseRushPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');
  if (!user.passActive) redirect('/etudiant/monetise/pass');

  const level = user.anneeEtude ?? 1;
  const state = await getRushState(user.id);

  // Stocks d'objets Rush (règle achat ≠ activation : utilisables pendant le jeu)
  const rushInventory = await prisma.userInventory.findMany({
    where: { userId: user.id, item: { category: 'RUSH' } },
    include: { item: true },
  });
  const stockOf = (name: string) => rushInventory.find(inv => inv.item.name === name)?.quantity ?? 0;

  // ===== Tentative en cours → jeu =====
  if (state.currentSession && state.currentSession.status === 'EN_COURS') {
    const session = state.currentSession;
    const pool = await prisma.clinicalCase.findMany({ where: { anneeEtude: level }, select: { id: true } });

    if (pool.length === 0) {
      return infoScreen('📭', 'Pas encore de cas pour ton niveau', 'De nouveaux cas cliniques seront bientôt publiés pour ton niveau.');
    }

    let unplayed = pool.filter(c => !session.playedCaseIds.includes(c.id));
    if (unplayed.length === 0) unplayed = pool;
    const nextId = shuffle(unplayed)[0].id;
    const clinicalCase = await prisma.clinicalCase.findUnique({
      where: { id: nextId },
      include: { chapter: { include: { subject: true } } },
    });
    if (!clinicalCase) return infoScreen('⚠️', 'Erreur', 'Cas introuvable, réessaie dans un instant.');

    return (
      <RushClient
        clinicalCase={{
          id: clinicalCase.id,
          title: clinicalCase.title,
          statement: clinicalCase.statement,
          options: clinicalCase.options,
          durationMax: clinicalCase.durationMax,
          difficulty: clinicalCase.difficulty,
          subject: clinicalCase.chapter.subject.name,
          chapter: clinicalCase.chapter.name,
        }}
        session={{ id: session.id, errors: session.errors, currentStreak: session.currentStreak, attemptNumber: session.attemptNumber }}
        uaBalance={user.uaBalance}
        weekendTotal={state.totalWeekend}
        bouclierStock={stockOf('Bouclier')}
        secondeChanceStock={stockOf('Seconde Chance')}
        tempsBonusStock={stockOf('Temps Bonus')}
      />
    );
  }

  // ===== Pas de tentative en cours → lancement + récapitulatif =====
  const lastSession = await prisma.rushSession.findFirst({
    where: { userId: user.id, weekend: getWeekendId() },
    orderBy: { startedAt: 'desc' },
  });
  const finishedSession = lastSession && lastSession.status !== 'EN_COURS' ? lastSession : null;

  const sessionUa = finishedSession
    ? await prisma.uaTransaction.aggregate({
        where: { userId: user.id, reference: finishedSession.id, type: { in: ['RUSH_P1', 'RUSH_P2', 'RUSH_P3'] } },
        _sum: { amount: true },
      })
    : null;

  const recap = finishedSession
    ? (RECAP[finishedSession.status as keyof typeof RECAP] ?? { emoji: '📊', label: finishedSession.status, color: 'text-white/50' })
    : null;

  return (
    <div className="space-y-6">
      {finishedSession && recap && (
        <div className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl p-6 animate-glow-gold">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl animate-float">{recap.emoji}</span>
            <div>
              <p className="font-extrabold text-white">
                Tentative #{finishedSession.attemptNumber} — <span className={recap.color}>{recap.label}</span>
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Série atteinte : {finishedSession.currentStreak} · Erreurs : {finishedSession.errors}
                {(sessionUa?._sum.amount ?? 0) > 0 && ` · +${(sessionUa?._sum.amount ?? 0).toLocaleString('fr-FR')} UA`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {finishedSession.palier1 && <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">✅ Palier 1</span>}
            {finishedSession.palier2 && <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">✅ Palier 2</span>}
            {finishedSession.palier3 && <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">🏆 Palier 3</span>}
            {finishedSession.palier3 && <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full">🎁 Coffre d'Élite : Gel + Restaure</span>}
          </div>
        </div>
      )}
      <RushStartPanel
        isWeekend={state.isWeekend}
        activeDays={state.activeDays}
        flameOk={state.flameOk}
        totalWeekend={state.totalWeekend}
        sessionsCount={state.sessionsCount}
        hasFinishedSession={finishedSession !== null}
        ticketCount={stockOf('Ticket Rush')}
      />
      <Link href="/etudiant/monetise" className="block text-center py-2 text-white/40 text-sm font-bold hover:text-yellow-300">← Retour</Link>
    </div>
  );
}