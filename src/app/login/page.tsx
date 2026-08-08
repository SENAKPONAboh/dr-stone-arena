'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
        
        {/* Logo et Titre */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-200">
            <span className="text-4xl">🧠</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">Dr. Stone Arena</h1>
          <p className="text-gray-500 mt-1 text-sm">Ton défi médical du jour t'attend.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" 
              placeholder="exemple@fac-medecine.com" 
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-gray-800 placeholder-gray-400" 
              placeholder="••••••••" 
            />
          </div>

          {/* Lien Mot de passe oublié */}
          <div className="text-right">
            <a href="/forgot-password" className="text-sm font-medium text-gray-400 hover:text-blue-600 transition-colors">
              Mot de passe oublié ?
            </a>
          </div>

          {/* Bouton de Connexion */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-extrabold rounded-2xl shadow-md shadow-emerald-300 transition-all uppercase tracking-wide mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Commencer'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">Pas encore de compte ? </span>
          <Link href="/register" className="font-extrabold text-emerald-600 hover:underline">
            S'inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}