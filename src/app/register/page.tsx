'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NIVEAU_OPTIONS } from '@/lib/niveau';
import AuthShell, { AUTH_INPUT, AUTH_LABEL, AUTH_BUTTON } from '@/components/ui/AuthShell';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAmbassador, setHasAmbassador] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
      } else {
        router.push('/login');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const choice = (active: boolean) =>
    `flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-colors ${active ? 'border-mala bg-mala/10 text-mala' : 'border-line text-mute hover:border-mute'}`;

  return (
    <AuthShell wide title="Créer ton compte" subtitle="Rejoins l'arène des étudiants en médecine et des médecins.">
      {error && (
        <div className="mb-4 rounded-2xl border-2 border-heart/40 bg-heart/10 px-4 py-3 text-center text-sm font-medium text-heart">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={AUTH_LABEL}>Prénom</label>
            <input id="prenom" name="prenom" type="text" required className={AUTH_INPUT} placeholder="Arthur" />
          </div>
          <div>
            <label className={AUTH_LABEL}>Nom</label>
            <input id="nom" name="nom" type="text" required className={AUTH_INPUT} placeholder="ABOH" />
          </div>
        </div>

        <div>
          <label className={AUTH_LABEL}>Email</label>
          <input id="email" name="email" type="email" required className={AUTH_INPUT} placeholder="exemple@fac-medecine.com" />
        </div>

        <div>
          <label className={AUTH_LABEL}>Mot de passe</label>
          <input id="password" name="password" type="password" required minLength={8} className={AUTH_INPUT} placeholder="8 caractères minimum" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={AUTH_LABEL}>Pays</label>
            <input id="pays" name="pays" type="text" required className={AUTH_INPUT} placeholder="Bénin" />
          </div>
          <div>
            <label className={AUTH_LABEL}>Université</label>
            <input id="universite" name="universite" type="text" required className={AUTH_INPUT} placeholder="UAC" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={AUTH_LABEL}>Faculté</label>
            <input id="faculte" name="faculte" type="text" required className={AUTH_INPUT} placeholder="Médecine" />
          </div>
          <div>
            <label className={AUTH_LABEL}>Année</label>
            <select id="anneeEtude" name="anneeEtude" required className={`${AUTH_INPUT} font-medium`}>
              {NIVEAU_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Question ambassadeur */}
        <div className="pt-2">
          <label className={AUTH_LABEL}>
            Es-tu venu grâce à un ambassadeur Doctor Stone Arena ?
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setHasAmbassador(false)} className={choice(!hasAmbassador)}>
              ○ Non
            </button>
            <button type="button" onClick={() => setHasAmbassador(true)} className={choice(hasAmbassador)}>
              ○ Oui
            </button>
          </div>
        </div>

        {hasAmbassador && (
          <div>
            <label className={AUTH_LABEL}>Code de ton ambassadeur</label>
            <input
              id="ambassadorCode"
              name="ambassadorCode"
              type="text"
              required
              placeholder="Ex: DSA-MARIE01"
              className={`${AUTH_INPUT} font-medium uppercase tracking-wide`}
            />
            <p className="mt-1 text-xs text-mute">Le code t'a été communiqué par ton ambassadeur.</p>
          </div>
        )}

        <button type="submit" disabled={loading} className={`${AUTH_BUTTON} mt-4`}>
          {loading ? 'Création...' : "Rejoindre l'arène"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-mute">Déjà un compte ? </span>
        <Link href="/login" className="font-extrabold text-mala hover:underline">
          Se connecter
        </Link>
      </div>
    </AuthShell>
  );
}
