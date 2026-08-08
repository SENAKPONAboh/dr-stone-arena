'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // États pour afficher/cacher les mots de passe
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // 1. Vérifier que les deux nouveaux mots de passe correspondent
    if (newPassword !== confirmPassword) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    // 2. Vérifier la longueur
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

  // Composant réutilisable pour le champ avec l'œil
  const PasswordInput = ({ name, label, show, setShow }: { name: string, label: string, show: boolean, setShow: (v: boolean) => void }) => (
    <div>
      <label className="block text-sm font-bold mb-2">{label}</label>
      <div className="relative">
        <input 
          type={show ? "text" : "password"} 
          name={name} 
          required 
          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 pr-12" 
        />
        <button 
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? (
            // Icône Œil barré
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            // Icône Œil ouvert
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
      
      <PasswordInput name="currentPassword" label="Mot de passe actuel" show={showCurrent} setShow={setShowCurrent} />
      <PasswordInput name="newPassword" label="Nouveau mot de passe" show={showNew} setShow={setShowNew} />
      <PasswordInput name="confirmPassword" label="Confirmer le nouveau mot de passe" show={showConfirm} setShow={setShowConfirm} />

      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm disabled:opacity-50">
        {loading ? 'Sauvegarde...' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}