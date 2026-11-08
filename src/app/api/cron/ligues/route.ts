// ===== TÂCHE DU DIMANCHE (Vercel Cron, voir vercel.json) : clôture des ligues de la semaine =====
// Lancée le dimanche à 23 h 05 UTC = lundi 0 h 05 à Niamey. Clôture la semaine qui vient de finir
// (montées, descentes, étoiles, coffres). Sécurité : « Authorization: Bearer <CRON_SECRET> ».
import { NextResponse } from 'next/server';
import { closeWeek } from '@/lib/league-close';
import { weekKey, weekStart } from '@/lib/league';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const prev = weekKey(new Date(weekStart().getTime() - 3600000));
  const result = await closeWeek(prev);
  return NextResponse.json({ week: prev, ...result });
}
