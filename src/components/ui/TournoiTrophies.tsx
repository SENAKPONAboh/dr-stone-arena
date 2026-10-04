import { getNiveauLabel } from '@/lib/niveau';
import { seasonLabel } from '@/lib/seasons';

// Trophées du tournoi mensuel : « Champion de promotion ×N » et nombre de tournois joués en finaliste.
// N'affiche rien pour ceux qui n'ont jamais été finalistes.
export default function TournoiTrophies({ data }: { data: { champion: { anneeEtude: number; season: string }[]; finalist: number } }) {
  if (data.finalist === 0) return null;
  const n = data.champion.length;
  return (
    <div className="mt-4 text-left">
      {n > 0 ? (
        <div className="space-y-2 rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.5)' }}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-extrabold">Champion de promotion</p>
              <p className="text-xs opacity-70">Vainqueur du tournoi mensuel de sa promotion</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 font-display text-lg font-black text-[#1a1308]">×{n}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.champion.slice(0, 8).map((c, i) => (
              <span key={i} className="rounded-full px-3 py-1 text-xs font-bold capitalize" style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.45)' }}>
                👑 {getNiveauLabel(c.anneeEtude)} · {seasonLabel(c.season)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl px-4 py-3 text-center text-sm font-bold" style={{ background: 'rgba(128,128,128,0.12)', border: '1px solid rgba(128,128,128,0.2)' }}>
          🎯 Finaliste de {data.finalist} tournoi{data.finalist > 1 ? 's' : ''} mensuel{data.finalist > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
