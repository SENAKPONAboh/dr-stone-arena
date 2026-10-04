'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type T = {
  id: string; title: string; status: string; phase: string; phaseLabel: string; prize: string | null;
  opensAt: string; closesAt: string; finalists: number; finished: number; casesCount: number; canFinish: boolean;
  results: { name: string; rank: number | null; score: number; time: number }[];
};

const LEVELS = [
  { v: 1, l: '1ère année' }, { v: 2, l: '2ème année' }, { v: 3, l: '3ème année' }, { v: 4, l: '4ème année' },
  { v: 5, l: '5ème année' }, { v: 6, l: '6ème année' }, { v: 7, l: 'Médecin' },
];

export default function TournoiAdmin({ seasons, tournaments, defaultOpens, defaultCloses, ready }: {
  seasons: { value: string; label: string }[]; tournaments: T[]; defaultOpens: string; defaultCloses: string; ready: boolean;
}) {
  const router = useRouter();
  const [season, setSeason] = useState(seasons[0]?.value ?? '');
  const [levels, setLevels] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [opens, setOpens] = useState(defaultOpens);
  const [closes, setCloses] = useState(defaultCloses);
  const [prize, setPrize] = useState('');
  const [allowFew, setAllowFew] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [results, setResults] = useState<{ label: string; status: string; message: string }[]>([]);

  const call = async (payload: any, label: string) => {
    setBusy(label); setMsg('');
    try {
      const res = await fetch('/api/admin/tournoi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'Erreur'); return data; }
      router.refresh();
      return data;
    } catch { setMsg('Erreur de connexion.'); } finally { setBusy(''); }
  };

  const create = async () => {
    setResults([]);
    const data = await call({ action: 'create', season, anneeEtudes: levels, opensAt: new Date(opens).toISOString(), closesAt: new Date(closes).toISOString(), prize, allowFewUnseen: allowFew }, 'create');
    if (data?.results) setResults(data.results);
  };

  const finish = async (t: T) => {
    if (!confirm(`Publier les résultats de « ${t.title} » ? Le classement final, le titre de Champion et les notifications seront envoyés. C'est définitif.`)) return;
    const data = await call({ action: 'finish', id: t.id }, 'finish' + t.id);
    if (data?.needsForce && confirm("La fenêtre de jeu n'est pas terminée. Clôturer quand même maintenant ?")) {
      await call({ action: 'finish', id: t.id, force: true }, 'finish' + t.id);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });

  return (
    <div className="space-y-6">
      {!ready && (
        <div className="rounded-3xl border-2 border-red-100 bg-red-50 p-5 text-sm text-red-700">
          🔧 <b>Les tables du tournoi n'existent pas encore.</b> Exécute une fois cette commande dans le terminal du projet, puis recharge cette page :
          <pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-xs text-gray-800">npx.cmd prisma db execute --file prisma/sql/2026-tournoi.sql</pre>
        </div>
      )}

      {/* Création */}
      <section className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="font-extrabold text-gray-800">➕ Créer les tournois d'un mois</h2>
        <p className="text-xs text-gray-500">
          Prérequis : la saison du mois doit être <b>clôturée</b> (page « Saison mensuelle »). Les {10} premiers de chaque promotion deviennent finalistes ; 20 cas inédits sont tirés automatiquement.
          Un tournoi créé est un <b>brouillon</b> : personne ne le voit tant que tu ne l'as pas publié.
        </p>

        {seasons.length === 0 ? (
          <p className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-700">Aucune saison clôturée pour le moment. Clôture d'abord le mois dans « Saison mensuelle ».</p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">Saison (mois d'où viennent les finalistes)</label>
              <select value={season} onChange={e => setSeason(e.target.value)} className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 font-bold text-gray-800">
                {seasons.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">Promotions</label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                  <button key={l.v} type="button" onClick={() => setLevels(p => p.includes(l.v) ? p.filter(x => x !== l.v) : [...p, l.v])}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold ${levels.includes(l.v) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'}`}>{l.l}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Ouverture</label>
                <input type="datetime-local" value={opens} onChange={e => setOpens(e.target.value)} className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-800" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">Clôture</label>
                <input type="datetime-local" value={closes} onChange={e => setCloses(e.target.value)} className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-800" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">Lot (facultatif, affiché aux étudiants)</label>
              <input value={prize} onChange={e => setPrize(e.target.value)} maxLength={200} placeholder="Ex : un livre de médecine offert par notre partenaire" className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-800" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={allowFew} onChange={e => setAllowFew(e.target.checked)} />
              Autoriser des cas déjà vus s'il n'y a pas assez de cas inédits
            </label>
            <button onClick={create} disabled={!!busy || !ready || levels.length === 0}
              className="w-full rounded-2xl bg-blue-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white disabled:opacity-40">
              {busy === 'create' ? 'Création…' : 'Créer les tournois (brouillons)'}
            </button>
          </>
        )}

        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <p key={i} className={`rounded-xl px-3 py-2 text-sm ${r.status === 'created' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                <b>{r.label}</b> — {r.message}
              </p>
            ))}
          </div>
        )}
        {msg && <p className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">{msg}</p>}
      </section>

      {/* Liste */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-400">Tournois</h2>
        {tournaments.length === 0 && <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-400">Aucun tournoi créé.</p>}
        {tournaments.map(t => (
          <div key={t.id} className="space-y-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-400">{fmt(t.opensAt)} → {fmt(t.closesAt)} · {t.finalists} finalistes · {t.finished} ont terminé · {t.casesCount} cas</p>
                {t.prize && <p className="mt-1 text-xs font-bold text-yellow-600">🎁 {t.prize}</p>}
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">{t.phaseLabel}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {t.status === 'BROUILLON' && (
                <>
                  <button onClick={() => confirm('Publier ? Les finalistes seront prévenus (notification + alerte téléphone).') && call({ action: 'publish', id: t.id }, 'pub' + t.id)}
                    disabled={!!busy} className="rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-extrabold uppercase text-white disabled:opacity-40">Publier</button>
                  <button onClick={() => confirm('Supprimer ce brouillon ?') && call({ action: 'delete', id: t.id }, 'del' + t.id)}
                    disabled={!!busy} className="rounded-2xl bg-gray-100 px-4 py-2 text-xs font-extrabold uppercase text-gray-600 disabled:opacity-40">Supprimer</button>
                </>
              )}
              {t.status === 'PUBLIE' && (
                <button onClick={() => finish(t)} disabled={!!busy}
                  className={`rounded-2xl px-4 py-2 text-xs font-extrabold uppercase text-white disabled:opacity-40 ${t.canFinish ? 'bg-red-500' : 'bg-gray-400'}`}>
                  Clôturer et publier les résultats
                </button>
              )}
            </div>

            {t.status === 'TERMINE' && t.results.length > 0 && (
              <div className="space-y-1">
                {t.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-1.5 text-sm">
                    <span className="font-bold text-gray-700">{r.rank === 1 && r.score > 0 ? '👑' : `n°${r.rank}`} {r.name}</span>
                    <span className="text-xs text-gray-500">{r.score}/{t.casesCount} · {Math.floor(r.time / 60)}′{String(r.time % 60).padStart(2, '0')}″</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
