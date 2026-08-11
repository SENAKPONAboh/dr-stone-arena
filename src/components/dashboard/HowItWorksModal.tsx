'use client';

import { useState } from 'react';

export default function HowItWorksModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 transition-all group hover:shadow-md"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">❓</span>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide text-center">Comment ça marche ?</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
            >
              &times;
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🧠</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Bienvenue dans l'Arène !</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Voici comment devenir le meilleur clinicien.</p>
            </div>

            <div className="space-y-5 text-gray-700 dark:text-gray-300">
              
              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">🚀</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">Les Défis (Cas Cliniques)</h3>
                  <p className="text-sm">Clique sur "Commencer le défi". L'application te donne un cas médical de ton année. Lis-le, choisis la bonne réponse avant la fin du chronomètre, et valide !</p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">❤️</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">Les Vies</h3>
                  <p className="text-sm">Tu as 5 vies. Une mauvaise réponse t'en fait perdre une. Si tu n'as plus de vies, tu dois attendre qu'elles se régénèrent (ou passer Premium pour attendre moins longtemps !).</p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">🔥</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">La Série (Streak)</h3>
                  <p className="text-sm">C'est ton nombre de jours d'affilée où tu as joué. Joue tous les jours pour faire monter la flamme ! Si tu t'arrêtes un jour, elle retombe à zéro. Au bout de 7 jours, tu débloques un coffre !</p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">⭐</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">L'Expérience (XP) et les Grades</h3>
                  <p className="text-sm">Chaque bonne réponse te donne de l'XP. Plus tu en gagnes, plus tu montes de grade (Bronze, Argent, Or...) pour impressionner tes camarades.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="text-3xl flex-shrink-0">🏆</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">Le Classement</h3>
                  <p className="text-sm">Compare ton XP avec celle des autres étudiants de ta faculté. Qui sera le premier de la promo à la fin du mois ?</p>
                </div>
              </div>

            </div>

            <button 
              onClick={() => setIsOpen(false)}
              className="w-full mt-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl uppercase tracking-wide text-sm transition-all"
            >
              J'ai compris, à moi de jouer !
            </button>
          </div>
        </div>
      )}
    </>
  );
}