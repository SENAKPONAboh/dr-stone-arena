import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { RUSH_FLAME_REQUIRED, RUSH_ETAGE_SIZE, RUSH_ETAGES, getWeekendId } from '@/lib/monetise';
import { caseDuration } from '@/lib/case-duration';

export function isRushWeekend(date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getWeekendMonday(date = new Date()): Date {
  const day = date.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekendSaturday(date = new Date()): Date {
  const saturday = getWeekendMonday(date);
  saturday.setDate(saturday.getDate() + 5);
  return saturday;
}

export async function getActiveDaysThisWeek(userId: string): Promise<number> {
  const monday = getWeekendMonday();
  const saturday = getWeekendSaturday();
  const [attempts, monetiseAttempts] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: userId, createdAt: { gte: monday, lt: saturday } },
      select: { createdAt: true },
    }),
    prisma.monetiseAttempt.findMany({
      where: { userId: userId, createdAt: { gte: monday, lt: saturday } },
      select: { createdAt: true },
    }),
  ]);
  const days = new Set<string>();
  [...attempts, ...monetiseAttempts].forEach(a => {
    const d = new Date(a.createdAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });
  return days.size;
}

export async function getRushWeekendTotal(userId: string): Promise<number> {
  const saturday = getWeekendSaturday();
  const agg = await prisma.uaTransaction.aggregate({
    where: {
      userId: userId,
      type: { in: ['RUSH_P1', 'RUSH_P2', 'RUSH_P3'] },
      createdAt: { gte: saturday },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

// C8 : clôture automatique des sessions EN_COURS appartenant à un week-end PASSÉ
// (joueur parti en pleine tentative : la session ne doit plus ni s'afficher, ni bloquer, ni être jouable)
export async function closeStaleRushSessions(userId: string, client: Prisma.TransactionClient = prisma) {
  await client.rushSession.updateMany({
    where: { userId: userId, status: 'EN_COURS', weekend: { not: getWeekendId() } },
    data: { status: 'TERMINE_ABANDON', finishedAt: new Date() },
  });
}

export async function getRushState(userId: string) {
  const weekendId = getWeekendId();

  // Nettoyage des sessions périmées avant lecture (même logique que côté API)
  await closeStaleRushSessions(userId);

  const [activeDays, totalWeekend, sessionsCount, currentSession] = await Promise.all([
    getActiveDaysThisWeek(userId),
    getRushWeekendTotal(userId),
    prisma.rushSession.count({ where: { userId: userId, weekend: weekendId } }),
    prisma.rushSession.findFirst({ where: { userId: userId, status: 'EN_COURS', weekend: weekendId } }),
  ]);
  return {
    isWeekend: isRushWeekend(),
    activeDays: activeDays,
    flameOk: activeDays >= RUSH_FLAME_REQUIRED,
    totalWeekend: totalWeekend,
    sessionsCount: sessionsCount,
    currentSession: currentSession,
  };
}

// ===== CAS SUIVANT DU RUSH =====
// Données envoyées au navigateur AVANT la réponse : jamais correctAnswer ni explanation.
export type RushCasePayload = {
  id: string; title: string; statement: string; options: string[];
  durationMax: number; difficulty: string; subject: string; chapter: string;
};

// ===== ÉTAGES DU RUSH : la difficulté monte avec les bonnes réponses =====
// 5 étages de 5 cas. É1 facile · É2 facile/moyen · É3 moyen · É4 moyen/difficile · É5 difficile.
// (Durées : facile 60 s, moyen 90 s, difficile 120 s — voir case-duration.ts)
const DIFFICULTY_ORDER = ['FACILE', 'MOYEN', 'DIFFICILE'];

export function rushDifficultyFor(correctCount: number): 'FACILE' | 'MOYEN' | 'DIFFICILE' {
  const etage = Math.min(RUSH_ETAGES, Math.floor(correctCount / RUSH_ETAGE_SIZE) + 1);
  const pos = correctCount % RUSH_ETAGE_SIZE;
  if (etage === 1) return 'FACILE';
  if (etage === 2) return pos % 2 === 0 ? 'FACILE' : 'MOYEN';
  if (etage === 3) return 'MOYEN';
  if (etage === 4) return pos % 2 === 0 ? 'MOYEN' : 'DIFFICILE';
  return 'DIFFICILE';
}

/** Nombre de cas différents disponibles pour un niveau (sert à savoir si la banque est épuisée). */
export async function countRushPool(level: number): Promise<number> {
  return prisma.clinicalCase.count({ where: { anneeEtude: level } });
}

/**
 * Tire au hasard un cas du niveau qui n'a pas encore été joué dans la tentative.
 * Si la banque du niveau est épuisée, on autorise une répétition (en évitant le tout dernier cas joué)
 * plutôt que de bloquer le joueur.
 */
export async function pickNextRushCase(level: number, playedIds: string[], correctCount = 0): Promise<RushCasePayload | null> {
  // On vise la difficulté de l'étage ; s'il n'y a pas assez de cas de cette difficulté, on prend la plus proche.
  const target = DIFFICULTY_ORDER.indexOf(rushDifficultyFor(correctCount));
  const pickClosest = (cands: { id: string; difficulty: string }[]): string | null => {
    if (cands.length === 0) return null;
    const dist = (d: string) => { const i = DIFFICULTY_ORDER.indexOf(String(d).toUpperCase()); return i < 0 ? 1 : Math.abs(i - target); };
    const best = Math.min(...cands.map(c => dist(c.difficulty)));
    const group = cands.filter(c => dist(c.difficulty) === best);
    return group[Math.floor(Math.random() * group.length)].id;
  };

  let id = pickClosest(await prisma.clinicalCase.findMany({
    where: { anneeEtude: level, id: { notIn: playedIds } },
    select: { id: true, difficulty: true },
  }));

  if (!id) {
    // Banque du niveau épuisée : on autorise une répétition (en évitant le tout dernier cas joué)
    const last = playedIds[playedIds.length - 1];
    const all = await prisma.clinicalCase.findMany({ where: { anneeEtude: level }, select: { id: true, difficulty: true } });
    id = pickClosest(all.length > 1 ? all.filter(c => c.id !== last) : all);
  }
  if (!id) return null;

  const c = await prisma.clinicalCase.findUnique({
    where: { id },
    include: { chapter: { include: { subject: true } } },
  });
  if (!c) return null;
  return {
    id: c.id,
    title: c.title,
    statement: c.statement,
    options: c.options,
    durationMax: caseDuration(c.difficulty, c.durationMax),
    difficulty: c.difficulty,
    subject: c.chapter.subject.name,
    chapter: c.chapter.name,
  };
}
