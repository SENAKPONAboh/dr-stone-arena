'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthShell, { AUTH_INPUT, AUTH_LABEL, AUTH_BUTTON } from '@/components/ui/AuthShell';
import ContactAdminButton from '@/components/ui/ContactAdminButton';

// Mot de passe oublié : l'étudiant reçoit son lien de réinitialisation sur WhatsApp (voir lib/password-reset.ts).
export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ enabled: boolean; link?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: new FormData(e.currentTarget).get('email') }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Une erreur est survenue');
      else setResult(data);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Pas de panique, tu peux le changer toi-même.">
      {error && (
        <div className="mb-4 rounded-2xl border-2 border-heart/40 bg-heart/10 px-4 py-3 text-center text-sm font-medium text-heart">
          {error}
        </div>
      )}

      {!result && (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className={AUTH_LABEL} htmlFor="email">Ton e-mail d&apos;inscription</label>
            <input id="email" name="email" type="email" required autoComplete="email" className={AUTH_INPUT} placeholder="exemple@fac-medecine.com" />
          </div>
          <button type="submit" disabled={loading} className={AUTH_BUTTON}>
            {loading ? 'Un instant...' : 'Continuer'}
          </button>
        </form>
      )}

      {result?.enabled && result.link && (
        <div className="space-y-4">
          <ol className="space-y-2 rounded-2xl border border-line bg-slab-2 p-4 text-sm text-ink">
            <li><b className="text-mala">1.</b> Touche le bouton vert : WhatsApp s&apos;ouvre avec un message déjà écrit.</li>
            <li><b className="text-mala">2.</b> Envoie-le <b>sans le modifier</b>, depuis le numéro WhatsApp donné à ton inscription.</li>
            <li><b className="text-mala">3.</b> Tu reçois aussitôt un lien pour choisir ton nouveau mot de passe (valable 30 minutes).</li>
          </ol>
          <a href={result.link} target="_blank" rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#128c4a] active:translate-y-1 active:shadow-[0_1px_0_#128c4a]">
            Recevoir mon lien sur WhatsApp
          </a>
          <button type="button" onClick={() => setResult(null)} className="w-full text-center text-xs font-bold text-mute hover:text-ink">
            Changer d&apos;e-mail
          </button>
        </div>
      )}

      {result && !result.enabled && (
        <p className="rounded-2xl border border-line bg-slab-2 p-4 text-center text-sm text-mute">
          Le changement automatique n&apos;est pas encore disponible. Contacte l&apos;administration ci-dessous : elle t&apos;enverra un lien pour choisir ton nouveau mot de passe.
        </p>
      )}

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="font-extrabold text-mala hover:underline">Retour à la connexion</Link>
      </div>

      <ContactAdminButton context="mot-de-passe" />
    </AuthShell>
  );
}
