'use client';

import { useState } from 'react';

type ImportReport = {
  total: number; created: number;
  createdTitles: string[];
  ignored: { numero: number; titre: string; raison: string }[];
};

const MODELE = `CAS 1

Titre :
Ce qu'il faut vérifier avant tout le reste

Année :
Médecin

Matière :
Pédiatrie

Chapitre :
Diarrhée aiguë chez l'enfant

Difficulté :
⭐⭐

Énoncé

Un enfant de 2 ans est amené pour une diarrhée aiguë évoluant depuis 2 jours...

Question

Pourquoi cette évaluation est-elle la priorité absolue ?

Propositions

A. La déshydratation est la complication principale et potentiellement grave de la diarrhée aiguë chez l'enfant
B. L'hydratation n'a aucune importance particulière
C. Seule la cause précise doit être recherchée en priorité
D. La déshydratation ne constitue jamais un risque significatif

Réponse correcte

A

Justification

La déshydratation est la complication principale de la diarrhée aiguë chez le jeune enfant.
`;

export default function BulkCaseImporter() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);

  const handleImport = async () => {
    if (!content.trim()) { setError('Colle d\'abord tes cas dans la zone de texte.'); return; }
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch('/api/admin/cases-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'import.');
      } else {
        setReport(data);
      }
    } catch (e) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {error && <div className="bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium text-center">{error}</div>}

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setContent(MODELE)}
          className="py-2.5 px-5 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm hover:bg-gray-200 transition-all">
          📋 Insérer un modèle
        </button>
        <button onClick={handleImport} disabled={loading}
          className="py-2.5 px-6 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wide disabled:opacity-50 transition-all">
          {loading ? '⏳ Import en cours...' : '📥 Importer les cas'}
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={22}
        spellCheck={false}
        placeholder="Colle ici tes cas (autant que tu veux, séparés par === CAS ===)..."
        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 font-mono text-xs text-gray-800 leading-relaxed"
      />

      {report && (
        <div className="space-y-4">
          <div className={`p-5 rounded-3xl border-2 ${report.created > 0
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'}`}>
            <p className={`font-extrabold text-lg ${report.created > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              ✅ {report.created} cas créé{report.created > 1 ? 's' : ''} sur {report.total} bloc{report.total > 1 ? 's' : ''}
            </p>
            {report.ignored.length > 0 && (
              <p className="text-sm text-orange-600 mt-1">⚠️ {report.ignored.length} bloc{report.ignored.length > 1 ? 's' : ''} ignoré{report.ignored.length > 1 ? 's' : ''} (détails ci-dessous)</p>
            )}
          </div>

          {report.ignored.length > 0 && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3">⚠️ Blocs ignorés</h3>
              <div className="space-y-2">
                {report.ignored.map((ig, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl text-sm">
                    <span className="font-bold text-orange-600 flex-shrink-0">#{ig.numero}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-700 truncate">{ig.titre}</p>
                      <p className="text-xs text-orange-600 mt-0.5">{ig.raison}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.created > 0 && report.createdTitles.length > 0 && report.createdTitles.length <= 20 && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3">✅ Cas créés</h3>
              <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                {report.createdTitles.map((t, i) => <li key={i} className="truncate">{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}