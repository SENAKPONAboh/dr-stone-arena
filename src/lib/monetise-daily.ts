// ===== TIRAGE QUOTIDIEN MONÉTISÉ =====
// Même logique que daily-cases, MAIS avec ses propres tables :
// sélection et tentatives totalement indépendantes du mode classique.

import prisma from '@/lib/prisma';
import { getReservedCaseIds } from '@/lib/tournoi';
import { UA_PER_CASE } from '@/lib/monetise';

const CASES_PER_DAY = 10;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getOrCreateMonetiseSelection(userId: string, anneeEtude: number): Promise<string[]> {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // 1. Sélection déjà figée pour aujourd'hui ?
  const existing = await prisma.monetiseSelection.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
  });
  if (existing) return existing.caseIds;

  // 2. Cas jamais tentés PAR CET UTILISATEUR côté monétisé (MonetiseAttempt — pas Attempt classique)
  const attemptsAsc = await prisma.monetiseAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { clinicalCaseId: true, createdAt: true },
  });
  const attemptedIds = new Set(attemptsAsc.map(a => a.clinicalCaseId));

  const everyCase = await prisma.clinicalCase.findMany({
    where: { anneeEtude },
    select: { id: true },
  });
  // Les cas réservés par un tournoi à venir restent inédits (sauf si la banque deviendrait trop petite)
  const reserved = new Set(await getReservedCaseIds());
  const notReserved = everyCase.filter(c => !reserved.has(c.id));
  const allCases = notReserved.length >= CASES_PER_DAY ? notReserved : everyCase;
  const neverSeen = allCases.filter(c => !attemptedIds.has(c.id));

  let selected: string[];
  if (neverSeen.length >= CASES_PER_DAY) {
    selected = shuffle(neverSeen).slice(0, CASES_PER_DAY).map(c => c.id);
  } else if (allCases.length === 0) {
    selected = [];
  } else {
    // Révision : jamais-vus d'abord + les plus anciennement tentés
    const lastAttempt = new Map<string, number>();
    for (const a of attemptsAsc) lastAttempt.set(a.clinicalCaseId, a.createdAt.getTime());
    const seenSorted = allCases
      .filter(c => attemptedIds.has(c.id))
      .sort((a, b) => (lastAttempt.get(a.id) ?? 0) - (lastAttempt.get(b.id) ?? 0));
    selected = shuffle([
      ...neverSeen.map(c => c.id),
      ...seenSorted.slice(0, CASES_PER_DAY - neverSeen.length).map(c => c.id),
    ]);
  }

  try {
    await prisma.monetiseSelection.create({
      data: { userId, date: today, caseIds: selected },
    });
  } catch (e: any) {
    if (e?.code !== 'P2002') throw e;
    // Créée au même instant par une autre requête (double-clic/refresh) : on renvoie la sélection
    // réellement enregistrée, sinon le cas affiché pourrait ne pas en faire partie.
    const saved = await prisma.monetiseSelection.findFirst({ where: { userId, date: { gte: today, lt: tomorrow } } });
    if (saved) return saved.caseIds;
  }

  return selected;
}

export const UA_PER_CASE_VALUE = UA_PER_CASE;
export const MONETISE_CASES_PER_DAY = CASES_PER_DAY;