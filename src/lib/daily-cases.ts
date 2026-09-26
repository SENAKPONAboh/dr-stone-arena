// ===== SÉLECTION QUOTIDIENNE DES CAS — Dr. Stone Arena =====
// Chaque étudiant reçoit 10 cas/jour tirés parmi les JAMAIS-TENTÉS de son niveau.
// Figée pour la journée (un refresh ne change rien).
// Si la banque s'épuise : complétion par révision (cas déjà vus, les plus anciens d'abord).
// Alerte admin automatique à 90% et 100% d'écoulement.

import prisma from '@/lib/prisma';
import { getNiveauLabel } from '@/lib/niveau';

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

// ===== Alerte admin : écoulement de la banque d'un niveau =====
async function checkBanqueAlert(anneeEtude: number, totalCases: number, tentesParEtudiant: number, studentId: string) {
  if (totalCases === 0) return;
  const ratio = tentesParEtudiant / totalCases;

  // Seuil 90% (une seule fois par niveau)
  if (ratio >= 0.9) {
    const tag = `BANQUE90-N${anneeEtude}`;
    const exists = await prisma.notification.findFirst({ where: { message: { contains: tag } } });
    if (!exists) {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            message: `📚 [${tag}] 90% de la banque de cas ${getNiveauLabel(anneeEtude)} a été parcourue par un étudiant (${tentesParEtudiant}/${totalCases}). Pense à renouveler la banque : 📥 Importer des cas en masse.`,
            icon: '📚'
          }
        });
      }
    }
  }

  // Seuil 100% (banque terminée — mode révision actif)
  if (ratio >= 1) {
    const tag = `BANQUE100-N${anneeEtude}`;
    const exists = await prisma.notification.findFirst({ where: { message: { contains: tag } } });
    if (!exists) {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            message: `⚠️ [${tag}] La banque de cas ${getNiveauLabel(anneeEtude)} est TERMINÉE pour un étudiant — mode révision actif. Importe de nouveaux cas pour relancer la progression.`,
            icon: '⚠️'
          }
        });
      }
    }
  }
  void studentId;
}

// ===== Récupère (ou crée) la sélection du jour d'un étudiant =====
export async function getOrCreateDailySelection(userId: string, anneeEtude: number): Promise<string[]> {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // 1. Sélection déjà figée pour aujourd'hui ?
  const existing = await prisma.dailyCaseSelection.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
  });
  if (existing) return existing.caseIds;

  // 2. Cas jamais tentés par CET étudiant dans SON niveau
  const attemptsAsc = await prisma.attempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { clinicalCaseId: true, createdAt: true },
  });
  const attemptedIds = new Set(attemptsAsc.map(a => a.clinicalCaseId));

  const allCases = await prisma.clinicalCase.findMany({
    where: { anneeEtude },
    select: { id: true },
  });
  const neverSeen = allCases.filter(c => !attemptedIds.has(c.id));

  let selected: string[];
  if (neverSeen.length >= CASES_PER_DAY) {
    // Cas normal : 10 tirés au hasard parmi les jamais-vus
    selected = shuffle(neverSeen).slice(0, CASES_PER_DAY).map(c => c.id);
  } else if (allCases.length === 0) {
    // Banque vide pour ce niveau
    selected = [];
  } else {
    // Banque presque/entièrement vue : les jamais-vus d'abord,
    // complétés par les déjà-vus les plus ANCIENNEMENT tentés (révision espacée)
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

  // 3. Figer la sélection du jour (concurrence : double-clic/refresh simultané)
  try {
    await prisma.dailyCaseSelection.create({
      data: { userId, date: today, caseIds: selected },
    });
  } catch (e: any) {
    if (e?.code !== 'P2002') throw e; // P2002 = déjà créée entre-temps → on utilise la valeur calculée
  }

  // 4. Alerte admin (90% / 100%)
  await checkBanqueAlert(anneeEtude, allCases.length, attemptedIds.size, userId);

  return selected;
}

// Lecture seule (sans création) : la sélection du jour si elle existe déjà.
// Utilisée par le dashboard/l'arène pour afficher le vrai total du jour.
export async function getTodaySelection(userId: string): Promise<string[] | null> {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const existing = await prisma.dailyCaseSelection.findFirst({
    where: { userId, date: { gte: today, lt: tomorrow } },
  });
  return existing?.caseIds ?? null;
}