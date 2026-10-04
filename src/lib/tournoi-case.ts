// Données d'un cas envoyées au navigateur PENDANT le tournoi : jamais la bonne réponse ni l'explication.
import { caseDuration } from '@/lib/case-duration';

export type TournoiCasePayload = {
  id: string; title: string; statement: string; options: string[];
  difficulty: string; durationMax: number; subject: string; chapter: string;
};

export async function getTournoiCasePayload(client: any, caseId: string): Promise<TournoiCasePayload | null> {
  const c = await client.clinicalCase.findUnique({
    where: { id: caseId },
    include: { chapter: { include: { subject: true } } },
  });
  if (!c) return null;
  return {
    id: c.id,
    title: c.title,
    statement: c.statement,
    options: c.options,
    difficulty: c.difficulty,
    durationMax: caseDuration(c.difficulty, c.durationMax),
    subject: c.chapter.subject.name,
    chapter: c.chapter.name,
  };
}
