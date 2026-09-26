import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ValidateButton from '@/components/admin/ValidateButton';
import Link from 'next/link';
import LogoutButton from '@/components/dashboard/LogoutButton';
import SendPushButton from '@/components/admin/SendPushButton';

export default async function AdminDashboard() {
  const user = await getCurrentUserCore();
  if (!user || user.role !== 'ADMIN') redirect('/login');

  const now = new Date();
  const [pendingUsers, totalUsers, totalCases, premiumActifs, totalSubjects] = await Promise.all([
    prisma.user.findMany({
      where: { statut: 'EN_ATTENTE', role: 'ETUDIANT' },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: { role: 'ETUDIANT' } }),
    prisma.clinicalCase.count(),
    prisma.user.count({ where: { role: 'ETUDIANT', isPremium: true, premiumExpiresAt: { gt: now } } }),
    prisma.subject.count(),
  ]);

  // Carte d'action réutilisable
  const actionCard = (href: string, icon: string, title: string, desc: string, colorClasses: string) => (
    <Link href={href} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${colorClasses}`}>{icon}</div>
        <div className="min-w-0">
          <p className="font-extrabold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );

  const sectionTitle = (icon: string, label: string) => (
    <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
      <span className="text-base">{icon}</span> {label}
    </h2>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      <header className="bg-white border-b-2 border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center text-xl shadow-lg">⚙️</div>
            <div>
              <h1 className="font-extrabold text-lg text-gray-800">Panel Administrateur</h1>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Dr. Stone Arena</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6 space-y-8">

        {/* ===== STATISTIQUES ===== */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">👥 Étudiants</p>
              <p className="text-3xl font-extrabold text-blue-600">{totalUsers}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">👑 Premium actifs</p>
              <p className="text-3xl font-extrabold text-yellow-500">{premiumActifs}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">🧠 Cas cliniques</p>
              <p className="text-3xl font-extrabold text-emerald-600">{totalCases}</p>
              <p className="text-[10px] text-gray-400 mt-1">{totalSubjects} matières</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">⏳ En attente</p>
              <p className={`text-3xl font-extrabold ${pendingUsers.length > 0 ? "text-orange-500" : "text-gray-300"}`}>{pendingUsers.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">comptes à valider</p>
            </div>
          </div>
        </section>

        {/* ===== VALIDATIONS EN ATTENTE ===== */}
        {pendingUsers.length > 0 && (
          <section>
            {sectionTitle('⏳', 'Étudiants en attente de validation')}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-3">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-4">
                  <div>
                    <p className="font-bold text-gray-800">{u.prenom} {u.nom}</p>
                    <p className="text-sm text-gray-500">{u.email} • {u.universite} - {u.faculte}</p>
                  </div>
                  <ValidateButton userId={u.id} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== CONTENU PÉDAGOGIQUE ===== */}
        <section>
          {sectionTitle('📚', 'Contenu pédagogique')}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {actionCard('/admin/cases', '📝', 'Créer un cas clinique', 'Rédiger et publier un cas individuel (QCM A/B/C/D)', 'bg-blue-50')}
            {actionCard('/admin/cases/bulk', '📥', 'Importer des cas en masse', "Coller 10, 50 ou 200 cas d'un coup (format CAS N°, EM1-EM6, Médecin)", 'bg-cyan-50')}
            {actionCard('/admin/content', '📚', 'Matières et chapitres', 'Gérer le programme : matières, chapitres, niveaux', 'bg-emerald-50')}
          </div>
        </section>

        {/* ===== UTILISATEURS ET MONÉTISATION ===== */}
        <section>
          {sectionTitle('👥', 'Utilisateurs et Monétisation')}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {actionCard('/admin/users', '👥', 'Gérer les étudiants', 'Comptes, statut Premium restant, bannissement, reset', 'bg-indigo-50')}
            {actionCard('/admin/premium', '👑', 'Validation Premium', 'Vérifier les reçus et activer les abonnements I/II/III', 'bg-yellow-50')}
            {actionCard('/admin/ambassadors', '🤝', 'Ambassadeurs', 'Codes, statuts, commissions et versements', 'bg-teal-50')}
            {actionCard('/admin/payment-methods', '💳', 'Moyens de paiement', 'Wave, Nita, Amanata, MTN MoMo — numéros et instructions', 'bg-purple-50')}
          </div>
        </section>

        {/* ===== FINANCES ET COMMUNICATION ===== */}
        <section>
          {sectionTitle('💰', 'Finances et Communication')}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {actionCard('/admin/finance', '💰', 'Centre Financier', 'CA, MRR, abonnés, commissions, dépenses, projections, alertes', 'bg-amber-50')}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-sky-50">📣</div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-gray-800">Notification Push</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">Envoyer une annonce à tous les étudiants</p>
                  <div className="mt-3"><SendPushButton /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ZONE DANGEREUSE ===== */}
        <section>
          {sectionTitle('⚠️', 'Zone dangereuse')}
          <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-red-100">🧨</div>
              <div>
                <p className="font-extrabold text-gray-800">Initialiser toutes les données</p>
                <p className="text-xs text-red-500 mt-1 leading-relaxed max-w-md">
                  Remet XP, grades, duels, badges, paiements à zéro (lancement officiel). Conserve la banque de cas et les comptes. Double confirmation requise.
                </p>
              </div>
            </div>
            <Link href="/admin/reset" className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wide shadow-md transition-all flex-shrink-0">
              ⚠️ Accéder
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}