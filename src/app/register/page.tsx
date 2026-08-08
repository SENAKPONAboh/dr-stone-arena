'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-10 p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-4xl">🩺</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">Créer ton compte</h1>
          <p className="text-gray-500 mt-1 text-sm">Rejoins l'arène des étudiants en médecine.</p>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Prénom</label>
              <input id="prenom" name="prenom" type="text" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="Arthur" />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Nom</label>
              <input id="nom" name="nom" type="text" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="ABOH" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input id="email" name="email" type="email" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="exemple@fac-medecine.com" />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
            <input id="password" name="password" type="password" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="••••••••" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Pays</label>
              <input id="pays" name="pays" type="text" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="Bénin" />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Université</label>
              <input id="universite" name="universite" type="text" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="UAC" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Faculté</label>
              <input id="faculte" name="faculte" type="text" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" placeholder="Médecine" />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Année</label>
              <select id="anneeEtude" name="anneeEtude" required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-800 font-medium">
                <option value="1">1ère année</option>
                <option value="2">2ème année</option>
                <option value="3">3ème année</option>
                <option value="4">4ème année</option>
                <option value="5">5ème année</option>
                <option value="6">6ème année</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-extrabold rounded-2xl shadow-md shadow-blue-300 transition-all uppercase tracking-wide mt-4 disabled:opacity-50">
            {loading ? 'Création...' : "Rejoindre l'arène"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">Déjà un compte ? </span>
          <Link href="/login" className="font-extrabold text-blue-600 hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}