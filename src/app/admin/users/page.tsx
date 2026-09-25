import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import ResetPasswordButton from '@/components/admin/ResetPasswordButton';
import BanButton from '@/components/admin/BanButton';
import { getNiveauLabel } from '@/lib/niveau';
import { getPlanLabel } from '@/lib/premium';

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const { filter } = await searchParams;
  const showPremiumOnly = filter === 'premium';
  const showFreeOnly = filter === 'gratuit';

  const where = {
    role: 'ETUDIANT' as const,
    ...(showPremiumOnly ? { isPremium: true } : {}),
    ...(showFreeOnly ? { isPremium: false } : {}),
  };

  // Liste + stats globales en parallèle
  const [students, totalStudents, totalPremium] = await Promise.all([
    prisma.user.findMany({
      where,
      // Premium en tête, expirations les plus proches d'abord
      orderBy: [{ isPremium: 'desc' }, { premiumExpiresAt: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, prenom: true, nom: true, email: true, universite: true,
        anneeEtude: true, isPremium: true, premiumTier: true, premiumExpiresAt: true, statut: true
      }
    }),
    prisma.user.count({ where: { role: 'ETUDIANT' } }),
    prisma.user.count({ where: { role: 'ETUDIANT', isPremium: true } }),
  ]);

  const now = Date.now();
  const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="font-extrabold text-xl text-gray-800">Gestion des Étudiants</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm font-bold mb-1">👥 Étudiants inscrits</p>
            <p className="text-3xl font-extrabold text-blue-600">{totalStudents}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm font-bold mb-1">👑 Abonnés Premium actifs</p>
            <p className="text-3xl font-extrabold text-yellow-500">{totalPremium}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/admin/users"
              className={`py-2 px-5 rounded-2xl text-sm font-bold uppercase tracking-wide transition-all ${!showPremiumOnly && !showFreeOnly ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              📋 Tous
            </Link>
            <Link href="/admin/users?filter=premium"
              className={`py-2 px-5 rounded-2xl text-sm font-bold uppercase tracking-wide transition-all ${showPremiumOnly ? 'bg-yellow-400 text-slate-900 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              👑 Premium
            </Link>
            <Link href="/admin/users?filter=gratuit"
              className={`py-2 px-5 rounded-2xl text-sm font-bold uppercase tracking-wide transition-all ${showFreeOnly ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              🆓 Gratuits
            </Link>
          </div>

          <div className="space-y-3">
            {students.length === 0 && (
              <p className="text-center text-gray-400 py-8 bg-gray-50 rounded-2xl">Aucun étudiant dans cette catégorie.</p>
            )}
            {students.map(u => {
              // --- Calculs Premium ---
              const expiresAt = u.premiumExpiresAt ? new Date(u.premiumExpiresAt) : null;
              const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now) / DAY_MS) : null;
              const subscribedAt = expiresAt ? new Date(expiresAt.getTime() - 30 * DAY_MS) : null;
              const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
              const expired = daysLeft !== null && daysLeft <= 0;

              return (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Nom + statut Premium */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800">
                        {u.prenom} {u.nom}
                        {u.statut === 'BANNI' && (
                          <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">BANNI</span>
                        )}
                      </p>
                      {u.isPremium ? (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold border border-yellow-200">
                          👑 {getPlanLabel(u.premiumTier)}
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold">Gratuit</span>
                      )}
                      {u.isPremium && (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${expired
                          ? 'bg-red-100 text-red-600'
                          : expiringSoon
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-emerald-100 text-emerald-600'}`}>
                          {expired
                            ? '🔴 Expiré'
                            : daysLeft !== null
                              ? (expiringSoon ? `🟠 Expire dans ${daysLeft} j` : `🟢 Actif · ${daysLeft} j restants`)
                              : '🟢 Actif'}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mt-1">{u.email} • {u.universite} ({getNiveauLabel(u.anneeEtude)})</p>

                    {/* Dates d'abonnement */}
                    {u.isPremium && expiresAt && (
                      <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span>📅 Souscrit le {fmtDate(subscribedAt!)}</span>
                        <span className="text-gray-300">→</span>
                        <span className={expired ? 'text-red-500 font-bold' : 'text-gray-500 font-bold'}>🗓️ Expire le {fmtDate(expiresAt)}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 items-end">
                    <ResetPasswordButton userId={u.id} />
                    <BanButton userId={u.id} isBanned={u.statut === 'BANNI'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}