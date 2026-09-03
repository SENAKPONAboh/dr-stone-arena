'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDuelGrade } from '@/lib/duel';

type SearchResult = {
  id: string; prenom: string; nom: string; pseudo: string | null;
  imageUrl: string | null; anneeEtude: number | null;
  isPremium: boolean; duelsWon: number; duelsLost: number;
};

export default function UserSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (res.ok) setResults(data.users);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un étudiant (nom ou pseudo)..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:border-emerald-500 text-gray-800 dark:text-white placeholder-gray-400 transition-all"
        />
      </div>
      {results.length > 0 && (
        <div className="mt-3 space-y-1">
          {results.map(u => {
            const grade = getDuelGrade(u.duelsWon);
            return (
              <Link key={u.id} href={`/etudiant/profil/${u.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                {u.imageUrl ? (
                  <img src={u.imageUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">{u.prenom.charAt(0)}{u.nom.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                    {u.pseudo || `${u.prenom} ${u.nom}`}
                    {u.isPremium && <span title="Premium">👑</span>}
                  </p>
                  <p className="text-xs text-gray-400">{grade.current.icon} {grade.current.name} • {u.duelsWon}V / {u.duelsLost}D</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {loading && <p className="text-xs text-gray-400 text-center mt-2">Recherche...</p>}
    </div>
  );
}