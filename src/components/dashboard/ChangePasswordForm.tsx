'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
       const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit faire au moins 6 caractères.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/profil/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur.');
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch (err) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-center font-bold">✅ Mot de passe modifié avec succès !</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-bold mb-2">Mot de passe actuel</label>
        <input type="password" name="currentPassword" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500" />
      </div>
      <div>
        <label className="block text-sm font-bold mb-2">Nouveau mot de passe</label>
        <input type="password" name="newPassword" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500" />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50">
        {loading ? 'Sauvegarde...' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}