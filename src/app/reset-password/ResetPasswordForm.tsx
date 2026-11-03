'use client';

import { useState } from 'react';
import Link from 'next/link';
import PasswordInput from '@/components/ui/PasswordInput';
import AuthShell, { AUTH_INPUT, AUTH_LABEL, AUTH_BUTTON } from '@/components/ui/AuthShell';
import ContactAdminButton from '@/components/ui/ContactAdminButton';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirm') ?? '')) { setError('Les deux mots de passe ne sont pas identiques.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Une erreur est survenue');
      else setDone(true);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Mot de passe changé" subtitle="Tu peux te reconnecter avec ton nouveau mot de passe.">
        <Link href="/login" className={`${AUTH_BUTTON} block text-center`}>Se connecter</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisis un mot de passe que tu n'oublieras pas.">
      {error && (
        <div className="mb-4 rounded-2xl border-2 border-heart/40 bg-heart/10 px-4 py-3 text-center text-sm font-medium text-heart">
          {error}
        </div>
      )}

      {!token ? (
        <p className="text-center text-sm text-mute">
          Ce lien est incomplet. Refais la demande depuis{' '}
          <Link href="/forgot-password" className="font-bold text-mala hover:underline">Mot de passe oublié ?</Link>
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className={AUTH_LABEL} htmlFor="password">Nouveau mot de passe</label>
            <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" className={AUTH_INPUT} placeholder="8 caractères minimum" />
          </div>
          <div>
            <label className={AUTH_LABEL} htmlFor="confirm">Confirme le mot de passe</label>
            <PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" className={AUTH_INPUT} placeholder="Le même, une deuxième fois" />
          </div>
          <button type="submit" disabled={loading} className={`${AUTH_BUTTON} mt-2`}>
            {loading ? 'Enregistrement...' : 'Changer mon mot de passe'}
          </button>
        </form>
      )}

      <ContactAdminButton context="mot-de-passe" />
    </AuthShell>
  );
}
