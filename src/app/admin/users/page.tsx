import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { headers } from 'next/headers';
import AdminHeader, { Stat } from '@/components/admin/ui/AdminHeader';
import AdminIcon from '@/components/admin/ui/AdminIcon';
import ResetPasswordButton from '@/components/admin/ResetPasswordButton';
import ResetLinkButton from '@/components/admin/ResetLinkButton';
import BanButton from '@/components/admin/BanButton';
import DeleteAccountButton from '@/components/admin/DeleteAccountButton';
import LevelSelect from '@/components/admin/LevelSelect';
import { getNiveauLabel } from '@/lib/niveau';
import { getPlanLabel } from '@/lib/premium';

const DAY_MS = 24 * 60 * 60 * 1000;

const LIST_LIMIT = 100;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ADMIN') redirect('/login');

  const { filter, q: qParam } = await searchParams;
  const showPremiumOnly = filter === 'premium';
  const showFreeOnly = filter === 'gratuit';
  // « N'a jamais joué » : aucun cas du jour tenté (pour les relancer sur WhatsApp)
  const showNeverPlayed = filter === 'jamais';
  const neverPlayed = { attempts: { none: {} } };
  const q = (qParam ?? '').trim().slice(0, 80);
  const nowDate = new Date();

  // « Premium » = abonnement encore valable ; un Premium expiré compte comme gratuit
  const activePremium = { isPremium: true, premiumExpiresAt: { gt: nowDate } };
  const where = {
    role: 'ETUDIANT' as const,
    ...(showPremiumOnly ? activePremium : {}),
    ...(showFreeOnly ? { NOT: activePremium } : {}),
    ...(showNeverPlayed ? neverPlayed : {}),
    ...(q ? {
      OR: ['prenom', 'nom', 'email', 'pseudo', 'universite'].map(field => ({ [field]: { contains: q, mode: 'insensitive' as const } })),
    } : {}),
  };

  // Liste + stats globales en parallèle
  const [students, matching, totalStudents, totalPremium, totalNeverPlayed] = await Promise.all([
    prisma.user.findMany({
      where,
      // Premium en tête, expirations les plus proches d'abord
      orderBy: [{ isPremium: 'desc' }, { premiumExpiresAt: 'asc' }, { createdAt: 'desc' }],
      take: LIST_LIMIT,
      select: {
        id: true, prenom: true, nom: true, email: true, universite: true,
        anneeEtude: true, isPremium: true, premiumTier: true, premiumExpiresAt: true, statut: true, onboardingCompleted: true
      }
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: 'ETUDIANT' } }),
    prisma.user.count({ where: { role: 'ETUDIANT', ...activePremium } }),
    prisma.user.count({ where: { role: 'ETUDIANT', ...neverPlayed } }),
  ]);

  // Numéros WhatsApp (table "UserPhone" ; vide tant que le SQL n'a pas été exécuté)
  const phones = new Map<string, string>();
  const verifiedPhones = new Set<string>();
  try {
    const rows = await prisma.userPhone.findMany({ where: { userId: { in: students.map(s => s.id) } }, select: { userId: true, phone: true, verifiedAt: true } });
    for (const r of rows) { phones.set(r.userId, r.phone); if (r.verifiedAt) verifiedPhones.add(r.userId); }
  } catch { /* table pas encore créée */ }

  // Message de relance WhatsApp (envoyé par l'admin lui-même, un par un)
  const site = `https://${(await headers()).get('host') ?? 'dr-stone-arena.vercel.app'}`;
  const relance = (prenom: string, onboardingDone: boolean) => onboardingDone
    ? `Salut ${prenom} ! Ta première garde de 10 cas t'attend sur Dr Stone Arena 🩺 Ça prend 5 minutes, et ton XP de novembre compte déjà pour le classement : ${site}/login
Un souci pour te connecter ? Réponds-moi ici.`
    : `Salut ${prenom} ! Ton inscription sur Dr Stone Arena n'est pas tout à fait terminée : il te reste quelques écrans avant ta première garde de 10 cas 🩺 Reconnecte-toi ici : ${site}/login
Si quelque chose te bloque, réponds-moi ici et je t'aide.`;

  const now = nowDate.getTime();
  const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const filterHref = (f: string | null) => `/admin/users?${new URLSearchParams({ ...(f ? { filter: f } : {}), ...(q ? { q } : {}) }).toString()}`;

  return (
    <div className="min-h-screen pb-12">
      <AdminHeader title="Gestion des étudiants" subtitle="Comptes, niveaux, accès" icon="users" tone="sky" />

      <main className="max-w-6xl mx-auto px-4 mt-5 space-y-4">

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Étudiants inscrits" value={totalStudents.toLocaleString('fr-FR')} tone="sky" />
          <Stat label="Premium actifs" value={totalPremium} tone="gold" />
          <Stat label="N'ont jamais joué" value={totalNeverPlayed} tone="heart" />
        </div>

        <div className="adm-card p-4 sm:p-6">
          <form action="/admin/users" className="mb-4 flex gap-2">
            {filter && <input type="hidden" name="filter" value={filter} />}
            <div className="relative flex-1">
              <AdminIcon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input name="q" defaultValue={q} placeholder="Nom, e-mail, pseudo ou université" className="adm-input pl-10" />
            </div>
            <button type="submit" className="adm-btn adm-btn-mala">Chercher</button>
          </form>

          <div className="mb-5 flex flex-wrap gap-2">
            <Link href={filterHref(null)} className={`adm-tab ${!showPremiumOnly && !showFreeOnly && !showNeverPlayed ? 'adm-tab-on' : ''}`}>Tous</Link>
            <Link href={filterHref('premium')} className={`adm-tab ${showPremiumOnly ? 'adm-tab-on' : ''}`}>Premium actifs</Link>
            <Link href={filterHref('gratuit')} className={`adm-tab ${showFreeOnly ? 'adm-tab-on' : ''}`}>Gratuits</Link>
            <Link href={filterHref('jamais')} className={`adm-tab ${showNeverPlayed ? 'adm-tab-on' : ''}`}>N'a jamais joué ({totalNeverPlayed})</Link>
            {q && <Link href={filter ? `/admin/users?filter=${filter}` : '/admin/users'} className="adm-tab">Effacer « {q} » ×</Link>}
          </div>
          <p className="mb-3 text-xs font-bold text-mute">
            {matching.toLocaleString('fr-FR')} compte{matching > 1 ? 's' : ''}{matching > LIST_LIMIT ? ` · les ${LIST_LIMIT} premiers sont affichés, affine la recherche` : ''}
          </p>

          <div className="space-y-3">
            {students.length === 0 && (
              <p className="adm-card-2 py-8 text-center text-sm text-mute">{q ? `Aucun compte ne correspond à « ${q} ».` : 'Aucun étudiant dans cette catégorie.'}</p>
            )}
            {students.map(u => {
              // --- Calculs Premium ---
              const expiresAt = u.premiumExpiresAt ? new Date(u.premiumExpiresAt) : null;
              const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now) / DAY_MS) : null;
              const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
              const expired = daysLeft !== null && daysLeft <= 0;

              const premiumOn = u.isPremium && !expired;

              return (
                <div key={u.id} className="adm-card-2 flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink">{u.prenom} {u.nom}</p>
                      {u.statut === 'BANNI' && <span className="adm-badge adm-badge-heart">Banni</span>}
                      {premiumOn ? <span className="adm-badge adm-badge-gold">{getPlanLabel(u.premiumTier)}</span> : <span className="adm-badge adm-badge-mute">Gratuit</span>}
                      {u.isPremium && expiresAt && (
                        <span className={`adm-badge ${expired ? 'adm-badge-heart' : expiringSoon ? 'adm-badge-flame' : 'adm-badge-mala'}`}>
                          {expired ? `Premium expiré le ${fmtDate(expiresAt)}` : `${daysLeft} j restants · jusqu'au ${fmtDate(expiresAt)}`}
                        </span>
                      )}
                    </div>

                    {showNeverPlayed && (
                      <span className={`mt-1 inline-block adm-badge ${u.onboardingCompleted ? 'adm-badge-flame' : 'adm-badge-heart'}`}>
                        {u.onboardingCompleted ? 'Accueil terminé · aucun cas joué' : "Bloqué dans l'accueil des nouveaux"}
                      </span>
                    )}
                    <p className="mt-1 truncate text-sm text-mute">{u.email} · {u.universite} ({getNiveauLabel(u.anneeEtude)})</p>
                    {phones.get(u.id) && (
                      <a href={`https://wa.me/${phones.get(u.id)!.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-bold text-mala hover:underline">
                        WhatsApp : {phones.get(u.id)} {verifiedPhones.has(u.id) ? '· vérifié' : '· non vérifié'}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-2 items-end">
                    {showNeverPlayed && phones.get(u.id) && (
                      <a href={`https://wa.me/${phones.get(u.id)!.replace(/\D/g, '')}?text=${encodeURIComponent(relance(u.prenom, u.onboardingCompleted))}`} target="_blank" rel="noopener noreferrer"
                        className="adm-btn adm-btn-mala adm-btn-sm">Relancer sur WhatsApp</a>
                    )}
                    <LevelSelect userId={u.id} current={u.anneeEtude} />
                    <ResetLinkButton userId={u.id} phone={phones.get(u.id)} />
                    <ResetPasswordButton userId={u.id} />
                    <BanButton userId={u.id} isBanned={u.statut === 'BANNI'} />
                    <DeleteAccountButton userId={u.id} name={`${u.prenom} ${u.nom}`} />
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