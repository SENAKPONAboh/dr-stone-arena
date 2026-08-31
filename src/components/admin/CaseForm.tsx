'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NIVEAU_OPTIONS } from '@/lib/niveau';

type Subject = { id: string; name: string };
type Chapter = { id: string; name: string; subjectId: string };

export default function CaseForm({ subjects, chapters }: { subjects: Subject[], chapters: Chapter[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const filteredChapters = chapters.filter(c => c.subjectId === selectedSubjectId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Titre du cas</label>
          <input type="text" name="title" required placeholder="Ex: Douleur thoracique" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Temps maximum (secondes)</label>
          <input type="number" name="durationMax" required defaultValue={60} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Matière</label>
          <select name="subjectId" required onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500">
            <option value="">Sélectionner...</option>
                          
                           {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Chapitre</label>
          <select name="chapterId" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500">
            <option value="">Sélectionner...</option>
            {filteredChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Année visée</label>
          <select name="anneeEtude" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500">
                       {NIVEAU_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Difficulté</label>
          <select name="difficulty" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500">
            <option value="FACILE">⭐ Facile (10 XP)</option>
            <option value="MOYEN">⭐⭐ Moyen (20 XP)</option>
            <option value="DIFFICILE">⭐⭐⭐ Difficile (35 XP)</option>
          </select>
        </div>
      </div>
      
      {/* Champ caché pour l'XP basé sur la difficulté (simplifié pour l'exemple) */}
      <input type="hidden" name="xp" value={10} />

      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Énoncé du cas</label>
        <textarea name="statement" required rows={4} placeholder="Décrivez la situation du patient..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500"></textarea>
      </div>

      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Options de réponse (une par ligne)</label>
        <textarea name="options" required rows={4} placeholder={"Péricardite\nInfarctus\nRGO\nCrise d'angoisse"} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500"></textarea>
      </div>

      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Bonne réponse exacte</label>
        <input type="text" name="correctAnswer" required placeholder="Doit correspondre exactement à une des options" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500" />
      </div>

      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Explication / Correction</label>
        <textarea name="explanation" required rows={3} placeholder="Expliquez pourquoi c'est la bonne réponse..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500"></textarea>
      </div>

      <button type="submit" disabled={loading} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide disabled:opacity-50">
        {loading ? 'Création...' : 'Publier le cas clinique'}
      </button>
    </form>
  );
}