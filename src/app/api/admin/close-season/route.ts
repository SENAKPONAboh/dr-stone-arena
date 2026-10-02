import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { getXpGrade, TOP_GRADE } from '@/lib/grades';
import { seasonLabel } from '@/lib/seasons';

// 🏁 CLÔTURE DE SAISON (mensuelle) — enregistre le grade final de chaque étudiant, puis remet les XP à zéro.
// Conservé : comptes, flamme, vies, duels, badges, UA, boutique… Seuls les XP repartent de zéro.
// Protégé contre le double clic : un même mois ne peut être clôturé qu'une seule fois.
export async function POST(request: Request) {
  const admin = await getCurrentUserCore();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const { season, confirmation } = await request.json();
    if (confirmation !== 'CLOTURER') return NextResponse.json({ error: 'Confirmation invalide.' }, { status: 400 });
    if (typeof season !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(season)) {
      return NextResponse.json({ error: 'Mois invalide (format AAAA-MM).' }, { status: 400 });
    }

    const already = await prisma.seasonResult.count({ where: { season } });
    if (already > 0) {
      return NextResponse.json({ error: `Le mois ${seasonLabel(season)} a déjà été clôturé.` }, { status: 409 });
    }

    const students = await prisma.user.findMany({
      where: { role: 'ETUDIANT', xp: { gt: 0 } },
      orderBy: { xp: 'desc' },
      select: { id: true, xp: true },
    });

    // Classement avec égalités (mêmes XP = même rang)
    let rank = 0;
    let prevXp = -1;
    const rows = students.map((s, i) => {
      if (s.xp !== prevXp) { rank = i + 1; prevXp = s.xp; }
      const grade = getXpGrade(s.xp).current;
      return { userId: s.id, season, xp: s.xp, gradeIndex: grade.index, rank };
    });

    const label = seasonLabel(season);
    await prisma.$transaction(async (tx) => {
      if (rows.length > 0) {
        await tx.seasonResult.createMany({ data: rows, skipDuplicates: true });
        await tx.notification.createMany({
          data: rows.map(r => {
            const g = getXpGrade(r.xp).current;
            return {
              userId: r.userId,
              icon: '🏁',
              message: `Saison ${label} terminée ! Tu la termines ${g.icon} ${g.name} (n°${r.rank}). Une nouvelle saison commence : tes XP repartent à zéro, à toi de jouer !`,
            };
          }),
        });
      }
      await tx.user.updateMany({ where: { role: 'ETUDIANT' }, data: { xp: 0 } });
    }, { timeout: 60000 });

    return NextResponse.json({
      success: true,
      season,
      players: rows.length,
      legends: rows.filter(r => r.gradeIndex === TOP_GRADE.index).length,
    });
  } catch (e: any) {
    if (e?.code === 'P2021' || /SeasonResult/.test(String(e?.message))) {
      return NextResponse.json({ error: "La table des saisons n'existe pas encore. Exécute d'abord le fichier SQL (prisma/sql/2026-saisons.sql)." }, { status: 500 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
