import type { XpGrade } from '@/lib/grades';
import GradeInsignia from './GradeInsignia';

// Insigne d'un grade (style rangs de Call of Duty) : voir GradeInsignia.
// `size` garde son sens d'origine (taille du médaillon) ; les ailes des grades du haut débordent sur les côtés.
export default function GradeEmblem({ grade, size = 96, locked = false }: { grade: XpGrade; size?: number; locked?: boolean }) {
  return <GradeInsignia grade={grade} size={Math.round(size * 1.1)} locked={locked} />;
}
