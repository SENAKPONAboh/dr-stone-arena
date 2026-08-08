'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TogglePremiumButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('receipt') as File;

    if (!file || file.size === 0) {
      setError('Veuillez sélectionner une image de reçu.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/premium/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'envoi.');
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-center">
        <p className="font-bold text-emerald-600">✅ Reçu envoyé !</p>
        <p className="text-sm text-emerald-500 mt-1">L'administrateur va valider votre abonnement sous peu.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleUpload} className="w-full space-y-3">
      <div>
        <label className="block text-gray-700 text-sm font-bold mb-2">Photo du reçu de paiement</label>
        <input 
          type="file" 
          name="receipt" 
          accept="image/*" 
          required 
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm transition-all disabled:opacity-50"
      >
        {loading ? 'Envoi en cours...' : 'Envoyer le reçu'}
      </button>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </form>
  );
}