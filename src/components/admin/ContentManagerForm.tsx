'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Subject = { id: string; name: string; anneeEtude: number };

export default function ContentManagerForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState('');

  const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingSubject(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
      } else {
        router.refresh();
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoadingSubject(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingChapter(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
      } else {
        router.refresh();
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoadingChapter(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-800";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Formulaire Ajout Matière */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">📚 Ajouter une Matière</h3>
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Nom de la matière</label>
            <input type="text" name="name" required placeholder="Ex: Pharmacologie" className={inputStyle} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Année d'étude</label>
            <select name="anneeEtude" required className={inputStyle}>
              <option value="1">1ère année</option>
              <option value="2">2ème année</option>
              <option value="3">3ème année</option>
              <option value="4">4ème année</option>
              <option value="5">5ème année</option>
              <option value="6">6ème année</option>
            </select>
          </div>
          <button type="submit" disabled={loadingSubject} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50">
            {loadingSubject ? 'Ajout...' : 'Créer la matière'}
          </button>
        </form>
      </div>

      {/* Formulaire Ajout Chapitre */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">📖 Ajouter un Chapitre</h3>
        <form onSubmit={handleAddChapter} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Nom du chapitre</label>
            <input type="text" name="name" required placeholder="Ex: Antibiotiques" className={inputStyle} />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Matière associée</label>
            <select name="subjectId" required className={inputStyle}>
              <option value="">Sélectionner une matière...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.anneeEtude}ème)</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loadingChapter} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50">
            {loadingChapter ? 'Ajout...' : 'Créer le chapitre'}
          </button>
        </form>
      </div>

      {error && <p className="text-red-500 text-sm text-center md:col-span-2">{error}</p>}
    </div>
  );
}