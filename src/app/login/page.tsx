'use client';

import { useState } from 'react';
import Link from 'next/link';
import PasswordInput from '@/components/ui/PasswordInput';
import AuthShell, { AUTH_INPUT, AUTH_LABEL, AUTH_BUTTON } from '@/components/ui/AuthShell';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
      } else {
        if (data.user.role === 'ADMIN') window.location.href = '/admin';
        else if (data.user.role === 'CORRECTEUR') window.location.href = '/correcteur';
        else window.location.href = '/etudiant';
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Dr. Stone Arena" subtitle="Ton défi médical du jour t'attend.">
      {error && (
        <div className="mb-4 rounded-2xl border-2 border-heart/40 bg-heart/10 px-4 py-3 text-center text-sm font-medium text-heart">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className={AUTH_LABEL}>Email</label>
          <input id="email" name="email" type="email" required className={AUTH_INPUT} placeholder="exemple@fac-medecine.com" />
        </div>

        <div>
          <label className={AUTH_LABEL}>Mot de passe</label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" className={AUTH_INPUT} placeholder="••••••••" />
        </div>

        {/* Lien Mot de passe oublié */}
        <div className="text-right">
          <a href="/forgot-password" className="text-sm font-medium text-mute transition-colors hover:text-mala">
            Mot de passe oublié ?
          </a>
        </div>

        {/* Bouton de Connexion */}
        <button type="submit" disabled={loading} className={`${AUTH_BUTTON} mt-2`}>
          {loading ? 'Connexion...' : 'Commencer'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-mute">Pas encore de compte ? </span>
        <Link href="/register" className="font-extrabold text-mala hover:underline">
          S'inscrire
        </Link>
      </div>
    </AuthShell>
  );
}
