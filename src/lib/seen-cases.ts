// ===== CAS DÉJÀ VUS (tous modes confondus) =====
// Un cas ne doit pas revenir tant que la banque de l'année n'est pas épuisée, quel que soit l'endroit où il a été vu :
// garde du jour (Attempt), Espace Élite (MonetiseAttempt), duels joués (Duel.caseIds) et Rush (RushSession.playedCaseIds).
// Renvoie, pour chaque cas vu, la date de la DERNIÈRE fois où l'étudiant l'a vu (pour revoir d'abord les plus anciens).
import prisma from '@/lib/prisma';

export async function getSeenCases(userIds: string | string[]): Promise<Map<string, number>> {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const seen = new Map<string, number>();
  const mark = (caseId: string, at: Date | null | undefined) => {
    const t = at ? at.getTime() : 0;
    if ((seen.get(caseId) ?? -1) < t) seen.set(caseId, t);
  };
  const [attempts, elite, duels, rush] = await Promise.all([
    prisma.attempt.findMany({ where: { userId: { in: ids } }, select: { clinicalCaseId: true, createdAt: true } }),
    prisma.monetiseAttempt.findMany({ where: { userId: { in: ids } }, select: { clinicalCaseId: true, createdAt: true } }).catch(() => []),
    prisma.duel.findMany({
      where: { status: { in: ['ACCEPTE', 'TERMINE'] }, OR: [{ requesterId: { in: ids } }, { opponentId: { in: ids } }] },
      select: { caseIds: true, acceptedAt: true, createdAt: true },
    }),
    prisma.rushSession.findMany({ where: { userId: { in: ids } }, select: { playedCaseIds: true, startedAt: true } }).catch(() => []),
  ]);
  for (const a of attempts) mark(a.clinicalCaseId, a.createdAt);
  for (const a of elite) mark(a.clinicalCaseId, a.createdAt);
  for (const d of duels) for (const c of d.caseIds) mark(c, d.acceptedAt ?? d.createdAt);
  for (const r of rush) for (const c of r.playedCaseIds) mark(c, r.startedAt);
  return seen;
}

/** Choisit `need` cas : d'abord jamais vus (au hasard), puis, seulement si la banque est épuisée, les vus il y a le plus longtemps. */
export function pickUnseenFirst<T extends { id: string }>(pool: T[], seen: Map<string, number>, need: number): string[] {
  const shuffle = <U,>(a: U[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const neverSeen = shuffle(pool.filter((c) => !seen.has(c.id)));
  if (neverSeen.length >= need) return neverSeen.slice(0, need).map((c) => c.id);
  const oldest = pool.filter((c) => seen.has(c.id)).sort((a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0));
  return shuffle([...neverSeen.map((c) => c.id), ...oldest.slice(0, need - neverSeen.length).map((c) => c.id)]);
}
