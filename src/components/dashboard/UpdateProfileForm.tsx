'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UpdateProfileForm({ currentPseudo, currentImageUrl, isPremium, currentAnneeEtude }: { currentPseudo: string | null, currentImageUrl: string | null, isPremium: boolean, currentAnneeEtude: number | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentImageUrl);

  const inputStyle = isPremium
    ? "w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-2xl focus:outline-none focus:border-yellow-400 transition-all placeholder-white/30 text-white"
    : "w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file)); // Affiche un aperçu immédiat
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch('/api/profil/update', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la sauvegarde.');
      } else {
        router.refresh(); // Rafraîchit la page pour voir la nouvelle photo
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold mb-2">Pseudo public</label>
        <input type="text" name="pseudo" defaultValue={currentPseudo || ''} placeholder="Dr. Stone" className={inputStyle} />
      </div>
       {/* AJOUT DU CHAMP ANNÉE */}
      <div>
        <label className="block text-sm font-bold mb-2">Année d'étude</label>
        <select name="anneeEtude" defaultValue={currentAnneeEtude || 1} className={inputStyle}>
          <option value="1">1ère année</option>
          <option value="2">2ème année</option>
          <option value="3">3ème année</option>
          <option value="4">4ème année</option>
          <option value="5">5ème année</option>
          <option value="6">6ème année</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">Photo de profil</label>
        <div className="flex items-center gap-4 mb-2">
          {preview ? (
            <img src={preview} alt="Aperçu" className={`w-20 h-20 rounded-full object-cover ${isPremium ? 'border-4 border-yellow-400' : 'border-4 border-emerald-500'}`} />
          ) : (
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${isPremium ? 'bg-blue-500 text-white border-4 border-yellow-400' : 'bg-blue-500 text-white border-4 border-blue-200'}`}>
              ?
            </div>
          )}
          <label className={`cursor-pointer py-2 px-4 rounded-xl text-sm font-semibold transition-all ${isPremium ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-500' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
            Choisir une image
            <input type="file" name="image" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-gray-400">Formats acceptés : JPG, PNG. (La photo sera coupée en rond).</p>
      </div>

      <button type="submit" disabled={loading} className={`w-full py-3 font-extrabold rounded-2xl uppercase tracking-wide text-sm transition-all disabled:opacity-50 ${isPremium ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
        {loading ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </form>
  );
}