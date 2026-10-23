import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import ValidateButton from '@/components/admin/ValidateButton';
import SendPushButton from '@/components/admin/SendPushButton';
import AdminHeader, { Stat, SectionTitle, TONE_CHIP, type Tone } from '@/components/admin/ui/AdminHeader';
import AdminIcon, { type AdminIconName } from '@/components/admin/ui/AdminIcon';
import AdminLogoutButton from '@/components/admin/ui/AdminLogoutButton';

export default async function AdminDashboard() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  const now = new Date();
  const [pendingUsers, totalUsers, totalCases, premiumActifs, passActifs, totalSubjects,
    pendingPremium, pendingPass, pendingRecharges, pendingPrimes, pendingCommissions, activeMethods] = await Promise.all([
    prisma.user.findMany({ where: { statut: 'EN_ATTENTE', role: 'ETUDIANT' }, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where: { role: 'ETUDIANT' } }),
    prisma.clinicalCase.count(),
    prisma.user.count({ where: { role: 'ETUDIANT', isPremium: true, premiumExpiresAt: { gt: now } } }),
    prisma.user.count({ where: { role: 'ETUDIANT', passActive: true, passExpiresAt: { gt: now } } }),
    prisma.subject.count(),
    prisma.premiumRequest.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.passRequest.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.rechargeRequest.count({ where: { status: 'EN_ATTENTE' } }),
    prisma.withdrawalRequest.count({ where: { status: { in: ['EN_ATTENTE', 'EN_TRAITEMENT'] } } }),
    prisma.ambassadorCommission.aggregate({ where: { status: 'EN_ATTENTE' }, _sum: { amount: true } }),
    prisma.paymentMethod.count({ where: { isActive: true } }),
  ]);
  const commissionsDue = pendingCommissions._sum.amount ?? 0;

  // Ce qui attend une action, dans l'ordre de la routine admin
  const todo = [
    { href: '/admin/premium', icon: 'crown', label: 'Reçus Premium', count: pendingPremium },
    { href: '/admin/monetise', icon: 'gem', label: 'Reçus Pass Élite', count: pendingPass },
    { href: '/admin/ua', icon: 'coins', label: 'Recharges UA', count: pendingRecharges },
    { href: '/admin/ua', icon: 'wallet', label: 'Primes Arena à payer', count: pendingPrimes },
    { href: '/admin/ambassadors', icon: 'handshake', label: 'Commissions à verser', count: commissionsDue > 0 ? 1 : 0, text: commissionsDue > 0 ? `${commissionsDue.toLocaleString('fr-FR')} F` : undefined },
  ] satisfies { href: string; icon: AdminIconName; label: string; count: number; text?: string }[];
  const todoCount = todo.reduce((s, t) => s + (t.count > 0 ? 1 : 0), 0) + (pendingUsers.length > 0 ? 1 : 0);

  type Card = { href: string; icon: AdminIconName; tone: Tone; title: string; desc: string; badge?: number };
  const groups: { title: string; icon: AdminIconName; cards: Card[] }[] = [
    {
      title: 'Paiements', icon: 'receipt', cards: [
        { href: '/admin/premium', icon: 'crown', tone: 'sky', title: 'Validation Premium', desc: 'Vérifier les reçus et activer Premium I, II ou III', badge: pendingPremium },
        { href: '/admin/monetise', icon: 'gem', tone: 'gold', title: 'Pass Élite', desc: "Vérifier les reçus et ouvrir l'Espace Élite (30 jours)", badge: pendingPass },
        { href: '/admin/ua', icon: 'bank', tone: 'gold', title: 'Trésorerie UA', desc: 'Payer les Primes Arena, valider les recharges, corriger un solde', badge: pendingRecharges + pendingPrimes },
        { href: '/admin/payment-methods', icon: 'card', tone: 'mala', title: 'Moyens de paiement', desc: `${activeMethods} actif${activeMethods > 1 ? 's' : ''} : numéros, bénéficiaires et instructions` },
        { href: '/admin/finance', icon: 'chart', tone: 'gold', title: 'Centre financier', desc: "Tout l'argent qui entre et qui sort, ce qu'il reste à payer" },
      ],
    },
    {
      title: 'Étudiants et communauté', icon: 'users', cards: [
        { href: '/admin/users', icon: 'users', tone: 'sky', title: 'Gestion des étudiants', desc: 'Rechercher un compte, niveau, mot de passe, bannissement' },
        { href: '/admin/ambassadors', icon: 'handshake', tone: 'mala', title: 'Ambassadeurs', desc: 'Codes, filleuls, commissions et versements' },
        { href: '/admin/saison', icon: 'flag', tone: 'flame', title: 'Saison mensuelle', desc: 'Fin du mois : garder les grades puis remettre les XP à zéro' },
        { href: '/admin/tournoi', icon: 'trophy', tone: 'gold', title: 'Tournoi mensuel', desc: 'Créer, publier et clôturer le tournoi des meilleurs' },
        { href: '/admin/suspects', icon: 'shield', tone: 'heart', title: 'Journal des suspects', desc: 'Réponses trop rapides, précision anormale : triche possible' },
      ],
    },
    {
      title: 'Banque de cas', icon: 'book', cards: [
        { href: '/admin/cases', icon: 'plus', tone: 'mala', title: 'Créer un cas', desc: 'Rédiger un cas clinique (QCM A/B/C/D)' },
        { href: '/admin/cases/bulk', icon: 'upload', tone: 'sky', title: 'Import en masse', desc: 'Coller 10, 50 ou 200 cas au format « CAS N° »' },
        { href: '/admin/cases-structured', icon: 'file', tone: 'sky', title: 'Import QCM structurés', desc: 'Format détaillé : titre, année, matière, chapitre, justification' },
        { href: '/admin/content', icon: 'layers', tone: 'mala', title: 'Matières et chapitres', desc: `${totalSubjects} matières : le programme et le nombre de cas` },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      <AdminHeader title="Panel administrateur" subtitle="Dr. Stone Arena" icon="shield" back={null} right={<AdminLogoutButton />} />

      <main className="mx-auto mt-5 max-w-6xl space-y-7 px-4">
        <section className="adm-rise grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Étudiants" value={totalUsers.toLocaleString('fr-FR')} tone="sky" />
          <Stat label="Premium actifs" value={premiumActifs} tone="sky" />
          <Stat label="Pass Élite actifs" value={passActifs} tone="gold" />
          <Stat label="Cas cliniques" value={totalCases.toLocaleString('fr-FR')} tone="mala" sub={`${totalSubjects} matières`} />
        </section>

        <section className="adm-rise">
          <SectionTitle icon="clock">À traiter aujourd'hui</SectionTitle>
          {todoCount === 0 ? (
            <div className="adm-card flex items-center gap-3 p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CHIP.mala}`}><AdminIcon name="check" /></span>
              <p className="text-sm font-bold">Rien en attente. Tout est à jour.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {todo.filter(t => t.count > 0).map(t => (
                <Link key={t.label} href={t.href} className="adm-card adm-link-card flex items-center gap-3 p-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${TONE_CHIP.flame}`}><AdminIcon name={t.icon} /></span>
                  <span className="min-w-0 flex-1 text-sm font-bold">{t.label}</span>
                  <span className="adm-dot">{t.text ?? t.count}</span>
                </Link>
              ))}
              {pendingUsers.length > 0 && (
                <a href="#comptes" className="adm-card adm-link-card flex items-center gap-3 p-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${TONE_CHIP.flame}`}><AdminIcon name="users" /></span>
                  <span className="min-w-0 flex-1 text-sm font-bold">Comptes à valider</span>
                  <span className="adm-dot">{pendingUsers.length}</span>
                </a>
              )}
            </div>
          )}
        </section>

        {pendingUsers.length > 0 && (
          <section id="comptes" className="adm-rise scroll-mt-20">
            <SectionTitle icon="users">Comptes en attente de validation</SectionTitle>
            <div className="adm-card divide-y divide-line">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">{u.prenom} {u.nom}</p>
                    <p className="truncate text-sm text-mute">{u.email} · {u.universite} · {u.faculte}</p>
                  </div>
                  <ValidateButton userId={u.id} />
                </div>
              ))}
            </div>
          </section>
        )}

        {groups.map(g => (
          <section key={g.title} className="adm-rise">
            <SectionTitle icon={g.icon}>{g.title}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.cards.map(c => (
                <Link key={c.href + c.title} href={c.href} className="adm-card adm-link-card flex items-start gap-3 p-4">
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${TONE_CHIP[c.tone]}`}><AdminIcon name={c.icon} size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-ink">{c.title}</span>
                      {!!c.badge && <span className="adm-dot">{c.badge}</span>}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-mute">{c.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="adm-rise">
          <SectionTitle icon="megaphone">Communication</SectionTitle>
          <div className="adm-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold">Notification push</p>
              <p className="text-xs text-mute">Une annonce envoyée sur le téléphone de tous les étudiants abonnés aux notifications.</p>
            </div>
            <SendPushButton />
          </div>
        </section>

        <section className="adm-rise">
          <SectionTitle icon="alert">Zone dangereuse</SectionTitle>
          <div className="flex flex-col gap-4 rounded-[20px] border border-heart/40 bg-heart/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${TONE_CHIP.heart}`}><AdminIcon name="bomb" size={22} /></span>
              <div>
                <p className="font-extrabold">Initialiser toutes les données</p>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-mute">
                  Remet XP, grades, duels, badges, paiements à zéro (lancement officiel). Conserve la banque de cas et les comptes. Double confirmation requise.
                </p>
              </div>
            </div>
            <Link href="/admin/reset" className="adm-btn adm-btn-danger">Accéder</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
