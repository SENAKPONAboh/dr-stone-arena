'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type ImportResult = { index: number; titre: string; status: 'CRÉÉ' | 'DOUBLON' | 'ERREUR'; message: string };
type ImportData = { total: number; created: number; duplicates: number; errors: number; results: ImportResult[] };

const STATUS_BADGE: Record<string, string> = {
  'CRÉÉ': 'bg-green-100 text-green-700',
  'DOUBLON': 'bg-gray-100 text-gray-500',
  'ERREUR': 'bg-red-100 text-red-700',
};

export default function StructuredCaseImporter() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportData | null>(null);

  const detected = (text.match(/^[ \t]*titre\b/gim) ?? []).length;

  const submit = async () => {
    if (!text.trim() || loading) return;
    if (!confirm(`${detected} QCM détecté(s) dans le texte. Lancer l'import dans la banque de cas ?`)) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/cases-structured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur'); return; }
      setResult(data);
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <h2 className="font-extrabold text-gray-800 dark:text-white mb-1">🧬 Import de QCM structurés</h2>
      <p className="text-xs text-gray-400 mb-4">
        Collez vos QCM (séparés par des tirets ou enchaînés) — Titre, Année, Matière, Chapitre, Difficulté, Énoncé, Question, Propositions A-D, Réponse, Justification. Matières et chapitres absents sont créés automatiquement.
      </p>

      {error && <p className="text-red-500 text-sm font-bold mb-4 text-center">{error}</p>}

      {/* Format attendu */}
      <details className="mb-4 bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-4">
        <summary className="text-xs font-bold text-gray-500 dark:text-gray-300 cursor-pointer">📄 Voir le format attendu (exemple)</summary>
        <pre className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 whitespace-pre-wrap font-mono">{`Titre : Maintien de l'asymétrie des phospholipides
Année : EM1
Semestre : S1
Matière : Biologie cellulaire
Chapitre : Membrane plasmique
Difficulté : ⭐

Énoncé
Dans les cellules eucaryotes...

Question
Quelle enzyme dépendante de l'ATP... ?

Propositions
A. La flippase...
B. La scramblase...
C. La floppase...
D. La phospholipase C...

Réponse correcte
A

Justification
La flippase transporte activement...

Objectif pédagogique
Identifier le rôle de la flippase...`}</pre>
      </details>

      {/* Zone de collage */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="Collez ici vos QCM structurés…"
        className="w-full bg-gray-50 dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-white font-mono placeholder:text-gray-300 focus:border-violet-400 outline-none"
      />

      <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
        <p className="text-xs text-gray-400 font-bold">
          {detected > 0 ? `🔎 ${detected} QCM détecté${detected > 1 ? 's' : ''}` : 'En attente de texte…'}
        </p>
        <div className="flex gap-2">
          {result && (
            <button onClick={() => { setText(''); setResult(null); }}
              className="px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-bold">
              🧹 Recommencer
            </button>
          )}
          <motion.button
            onClick={submit}
            disabled={loading || detected === 0}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-extrabold uppercase tracking-wide disabled:opacity-40"
          >
            {loading ? '⏳ Import en cours…' : '🧬 Importer dans la banque'}
          </motion.button>
        </div>
      </div>

      {/* Résultats */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-gray-700 dark:text-gray-200">{result.total}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">analysés</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-green-600">{result.created}</p>
              <p className="text-[10px] font-bold text-green-500 uppercase">créés ✅</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-gray-500">{result.duplicates}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">doublons ♻️</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-extrabold text-red-600">{result.errors}</p>
              <p className="text-[10px] font-bold text-red-400 uppercase">erreurs ❌</p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.results.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-3">
                <span className="text-xs font-extrabold text-gray-400 w-8 flex-shrink-0">#{r.index}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{r.titre}</p>
                  <p className="text-[11px] text-gray-400 truncate">{r.message}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[r.status]}`}>{r.status}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}