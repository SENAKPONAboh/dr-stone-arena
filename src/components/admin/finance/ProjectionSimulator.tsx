'use client';

import { useState } from 'react';

type Props = {
  initialAbonnes: number;
  initialPanier: number;
  initialDepenses: number;
};

export default function ProjectionSimulator({ initialAbonnes, initialPanier, initialDepenses }: Props) {
  const [abonnes, setAbonnes] = useState(initialAbonnes);
  const [croissance, setCroissance] = useState(15);
  const [churn, setChurn] = useState(10);
  const [panier, setPanier] = useState(initialPanier);
  const [depenses, setDepenses] = useState(initialDepenses);
  const [commission, setCommission] = useState(10);

  const project = (months: number) => {
    let a = abonnes;
    let caCum = 0, comCum = 0, depCum = 0;
    for (let m = 1; m <= months; m++) {
      const departs = Math.round(a * churn / 100);
      const nouveaux = Math.round(a * croissance / 100);
      a = a - departs + nouveaux;
      const caMois = a * panier;
      caCum += caMois;
      comCum += (caMois * commission) / 100;
      depCum += depenses;
    }
    return { abonnes: a, mrr: a * panier, caCum, comCum, depCum, resultat: caCum - comCum - depCum };
  };

  const p3 = project(3);
  const p6 = project(6);
  const p12 = project(12);

  const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' FCFA';
  const input = "w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 text-sm";

  const scenarios = [
    { name: '🛡️ Prudent', cro: 5, ch: 15 },
    { name: '⚖️ Central', cro: 15, ch: 10 },
    { name: '🚀 Optimiste', cro: 30, ch: 5 },
  ];

  const resultCard = (title: string, p: ReturnType<typeof project>) => (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2 text-sm">
        <p className="flex justify-between"><span className="text-gray-400">Abonnés Premium</span><span className="font-bold text-gray-700">{p.abonnes}</span></p>
        <p className="flex justify-between"><span className="text-gray-400">MRR mensuel</span><span className="font-bold text-purple-600">{fmt(p.mrr)}</span></p>
        <p className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-400">CA cumulé</span><span className="font-bold text-emerald-600">{fmt(p.caCum)}</span></p>
        <p className="flex justify-between"><span className="text-gray-400">Commissions ({commission}%)</span><span className="font-bold text-orange-500">-{fmt(p.comCum)}</span></p>
        <p className="flex justify-between"><span className="text-gray-400">Dépenses</span><span className="font-bold text-red-500">-{fmt(p.depCum)}</span></p>
        <p className="flex justify-between border-t border-gray-100 pt-2">
          <span className="text-gray-500 font-bold">Résultat estimé</span>
          <span className={`font-extrabold ${p.resultat >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{p.resultat >= 0 ? '+' : ''}{fmt(p.resultat)}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Hypothèses */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h3 className="font-extrabold text-gray-800">⚙️ Hypothèses (modifiables)</h3>
          <div className="flex gap-2">
            {scenarios.map(s => (
              <button key={s.name}
                onClick={() => { setCroissance(s.cro); setChurn(s.ch); }}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${croissance === s.cro && churn === s.ch
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Abonnés actuels</label>
            <input type="number" min="0" value={abonnes} onChange={e => setAbonnes(Math.max(0, parseInt(e.target.value) || 0))} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Croissance / mois (%)</label>
            <input type="number" min="0" max="200" value={croissance} onChange={e => setCroissance(parseInt(e.target.value) || 0)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Churn / mois (%)</label>
            <input type="number" min="0" max="100" value={churn} onChange={e => setChurn(parseInt(e.target.value) || 0)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Panier moyen (FCFA)</label>
            <input type="number" min="0" value={panier} onChange={e => setPanier(Math.max(0, parseInt(e.target.value) || 0))} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Dépenses / mois (FCFA)</label>
            <input type="number" min="0" value={depenses} onChange={e => setDepenses(Math.max(0, parseInt(e.target.value) || 0))} className={input} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Commission (%)</label>
            <input type="number" min="0" max="100" value={commission} onChange={e => setCommission(parseInt(e.target.value) || 0)} className={input} />
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resultCard('🔮 Dans 3 mois', p3)}
        {resultCard('🔮 Dans 6 mois', p6)}
        {resultCard('🔮 Dans 12 mois', p12)}
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-100 p-4 rounded-3xl">
        <p className="text-xs text-yellow-700 leading-relaxed">
          ⚠️ <b>Projections, pas des prédictions</b> : les résultats dépendent entièrement des hypothèses ci-dessus (pré-remplies avec tes données réelles : {initialAbonnes} abonné(s), panier {initialPanier.toLocaleString('fr-FR')} FCFA, dépenses {initialDepenses.toLocaleString('fr-FR')} FCFA/mois). Le modèle suppose que chaque abonné paie son abonnement chaque mois, avec {churn}% de départs et {croissance}% de nouveaux abonnés mensuels. Les commissions simulent le futur programme d'ambassadeurs (non implémenté).
        </p>
      </div>
    </div>
  );
}