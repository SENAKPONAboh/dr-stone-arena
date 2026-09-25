import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getNiveauLabel } from '@/lib/niveau';

export default async function AmbassadorUsersPage() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/login');

  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true }
  });
  if (!ambassador || ambassador.status !== 'ACTIF') redirect('/etudiant');

  const now = new Date();
  const users = await prisma.user.findMany({
    where: { referredById: ambassador.id },
    orderBy: { createdAt: 'desc' },
    // Champs publics uniquement (§16 : pas d'email, pas de données sensibles)
    select: {
      id: true, prenom: true, nom: true, pseudo: true, imageUrl: true,
      pays: true, universite: true, anneeEtude: true,
      isPremium: true, premiumExpiresAt: true, createdAt: true
    }
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold text-gray-800">👥 Mes utilisateurs ({users.length})</h2>

      {users.length === 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-100 p-6 rounded-3xl text-center">
          <p className="text-4xl mb-2">🌱</p>
          <p className="font-bold text-yellow-700">Aucun utilisateur pour l'instant</p>
          <p className="text-sm text-yellow-600 mt-1">Partage ton code pour faire connaître Dr. Stone Arena !</p>
          <Link href="/ambassadeur/code" className="inline-block mt-4 py-2 px-6 bg-emerald-500 text-white font-bold rounded-2xl text-sm">🔑 Voir mon code</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => {
            const premiumActif = u.isPremium && u.premiumExpiresAt && new Date(u.premiumExpiresAt) > now;
            return (
              <div key={u.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                {u.imageUrl ? (
                  <img src={u.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                    {u.prenom.charAt(0)}{u.nom.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate flex items-center gap-2">
                    {u.pseudo || `${u.prenom} ${u.nom}`}
                    {premiumActif ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">👑 Premium</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Gratuit</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {getNiveauLabel(u.anneeEtude)}
                    {u.pays ? ` · 🌍 ${u.pays}` : ''}
                    {u.universite ? ` · 🏫 ${u.universite}` : ''}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">Inscrit le {u.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}