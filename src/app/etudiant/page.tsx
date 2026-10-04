import { getCurrentUserCore } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { calculateRegeneratedLives, getRegenIntervalMs } from '@/lib/lives';
import Link from 'next/link';
import DuelInvitationBanner from '@/components/dashboard/DuelInvitationBanner';
import { expireStaleDuels } from '@/lib/duel-server';
import { getTodaySelection } from '@/lib/daily-cases';
import { getNiveauLabel } from '@/lib/niveau';
import { getDuelGrade } from '@/lib/duel';
import GoldAvatar from '@/components/ui/GoldAvatar';
import Icon from '@/components/ui/Icon';
import GradeBadge from '@/components/ui/GradeBadge';
import TournoiHomeCard from '@/components/tournoi/TournoiHomeCard';
import LegendMark from '@/components/ui/LegendMark';
import { getLegendCounts } from '@/lib/seasons';
import { getXpGrade, gradeProgress } from '@/lib/grades';
import { getTitleDef } from '@/lib/personnalisation-data';
import TitleBadge from '@/components/ui/TitleBadge';
import EcgLine from '@/components/ui/EcgLine';
import ProgressPath from '@/components/ui/ProgressPath';
import HomeStagger from '@/components/dashboard/HomeStagger';

export default async function EtudiantDashboard() {
  const user = await getCurrentUserCore();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ETUDIANT') redirect('/login');
  if (user.statut !== 'VALIDE') redirect('/api/auth/logout');

  const premium = user.isPremium;

  // === LOGIQUE MÉTIER (conservée à l'identique) ===

  // Expiration Premium
  if (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPremium: false, premiumTier: null, premiumExpiresAt: null }
    });
    user.isPremium = false;
    user.premiumTier = null;
  }

  // Régénération des vies
  const lifeData = calculateRegeneratedLives(user.lives, user.lastLifeLostAt, user.premiumTier);
  if (lifeData.lives !== user.lives) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lives: lifeData.lives, lastLifeLostAt: lifeData.updatedAt }
    });
    user.lives = lifeData.lives;
    user.lastLifeLostAt = lifeData.updatedAt ?? user.lastLifeLostAt;
  }

  // Expiration des duels
  await expireStaleDuels(user.id);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // === Compte à rebours de la prochaine vie (affichage) ===
  let nextLifeAt: string | null = null;
  if (user.lives < 10 && user.lastLifeLostAt) {
    const interval = getRegenIntervalMs(user.premiumTier);
    const base = new Date(user.lastLifeLostAt).getTime();
    const elapsed = Date.now() - base;
    const nextPalier = (Math.floor(elapsed / interval) + 1) * interval;
    nextLifeAt = new Date(base + nextPalier).toISOString();
  }

  const formatDelay = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "moins d'1 min";
    const mins = Math.ceil(ms / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  // === LECTURES parallélisées (gain de latence) ===
  const [attemptsCount, usersAhead, aheadInLevel, attemptsToday, duelInvites, activeDuels, topUsers, dailyCaseIds] = await Promise.all([
    prisma.attempt.count({ where: { userId: user.id } }),
    prisma.user.count({ where: { role: 'ETUDIANT', statut: 'VALIDE', xp: { gt: user.xp } } }),
    user.anneeEtude
      ? prisma.user.count({ where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude, xp: { gt: user.xp } } })
      : Promise.resolve(null),
    prisma.attempt.count({ where: { userId: user.id, createdAt: { gte: todayStart } } }),
    prisma.duel.findMany({
      where: { opponentId: user.id, status: 'EN_ATTENTE' },
      include: { requester: { select: { id: true, prenom: true, nom: true, pseudo: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.duel.count({ where: { status: 'ACCEPTE', OR: [{ requesterId: user.id }, { opponentId: user.id }] } }),
    user.anneeEtude
      ? prisma.user.findMany({
          where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude },
          orderBy: { xp: 'desc' },
          take: 3,
          select: { id: true, prenom: true, nom: true, xp: true, pseudo: true, imageUrl: true, isPremium: true, passActive: true, activeFrameId: true, activeTitleId: true }
        })
      : Promise.resolve([]),
    getTodaySelection(user.id),
  ]);

  const userRank = usersAhead + 1;
  const userRankLevel = aheadInLevel !== null ? aheadInLevel + 1 : null;
  const dailyTotal = dailyCaseIds?.length ?? 10;

  // Grade de la saison (XP du mois)
  const { current: xpGrade, next: xpNextGrade } = getXpGrade(user.xp);

  const { current: duelGrade } = getDuelGrade(user.duelsWon);
  const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;

  // Notifications intelligentes (write conditionnel après les lectures)
  if (attemptsToday === 0) {
    const todayNotifExists = await prisma.notification.findFirst({
      where: { userId: user.id, createdAt: { gte: todayStart }, message: { contains: "défi quotidien" } }
    });
    if (!todayNotifExists) {
      await prisma.notification.create({
        data: { userId: user.id, message: "Ton défi quotidien est disponible. Joue maintenant pour gagner des XP !", icon: "🧠" }
      });
      if (user.streak > 0) {
        await prisma.notification.create({
          data: { userId: user.id, message: `Attention, tu risques de perdre ta série de ${user.streak} jours si tu ne joues pas aujourd'hui !`, icon: "🔥" }
        });
      }
    }
  }

  // === PRÉSENTATION (charte Arena Malachite) ===
  const doneToday = Math.min(attemptsToday, dailyTotal);
  const gradePct = gradeProgress(user.xp);
  const legends = await getLegendCounts(topUsers.map(u => u.id));
  const card = 'rounded-3xl border border-line bg-slab';

  return (
    <div className="space-y-5">

      {/* Invitations de duel (bannière géante — uniquement si présentes) */}
      {duelInvites.length > 0 && (
        <DuelInvitationBanner invites={duelInvites.map(d => ({
          id: d.id,
          requesterName: nameOf(d.requester),
          requesterImage: d.requester.imageUrl,
          expiresAt: d.expiresAt.toISOString()
        }))} />
      )}

      <HomeStagger>
        {/* Salutation + grade */}
        <div className={`${card} p-5`}>
          <h1 className="font-display text-xl font-extrabold text-ink">Bonjour {user.prenom}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <GradeBadge grade={xpGrade} />
            <span className="text-sm text-mute">{getNiveauLabel(user.anneeEtude)}</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slab-2">
            <div className="h-full origin-left rounded-full bg-mala" style={{ transform: `scaleX(${gradePct / 100})`, transition: 'transform 1s ease-out' }} />
          </div>
          <p className="mt-1.5 text-[11px] font-bold text-mute">
            {xpNextGrade ? `${(xpNextGrade.min - user.xp).toLocaleString('fr-FR')} XP avant ${xpNextGrade.icon} ${xpNextGrade.name} · saison en cours` : `${xpGrade.icon} Sommet de la saison atteint, bravo !`}
          </p>
          <EcgLine className="mt-3 h-5 opacity-70" />
        </div>

        {/* Vies + rang */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`${card} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Vies</p>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-heart">
              <span className={`inline-flex ${user.lives <= 2 ? 'animate-heartbeat-fast' : 'animate-heartbeat'}`}><Icon name="heart" size={24} /></span>
              {user.lives}<span className="text-sm text-mute">/10</span>
            </p>
            {nextLifeAt && (
              <p className="mt-1 text-[10px] font-bold text-mute">
                {premium ? (user.premiumTier === 3 ? "1/h" : user.premiumTier === 2 ? "1/6h" : "1/12h") : "1/24h"} · dans {formatDelay(nextLifeAt)}
              </p>
            )}
          </div>
          <Link href="/etudiant/leaderboard?scope=niveau" className={`${card} p-4 transition-transform active:scale-[0.98]`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Rang {userRankLevel ? `(${getNiveauLabel(user.anneeEtude)})` : ''}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-sky">#{userRankLevel ?? userRank}</p>
            <p className="text-[10px] font-bold text-mute">Global #{userRank}</p>
          </Link>
        </div>

        {/* Parcours du jour */}
        <div className={`${card} p-5`}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-ink">Garde du jour</h2>
            <span className="font-display text-xs font-bold tabular-nums text-mala">{doneToday}/{dailyTotal}</span>
          </div>
          <ProgressPath total={dailyTotal} done={doneToday} />
          {user.lives > 0 ? (
            doneToday >= dailyTotal ? (
              <Link href="/etudiant/challenge" className="mt-3 block rounded-2xl bg-slab-2 px-5 py-3.5 text-center font-display text-sm font-bold uppercase tracking-wide text-mala">
                Garde terminée — voir le bilan
              </Link>
            ) : (
              <Link href="/etudiant/challenge"
                className="mt-3 block rounded-2xl bg-mala px-5 py-3.5 text-center font-display text-sm font-bold uppercase tracking-wide text-stone shadow-[0_5px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
                {doneToday === 0 ? 'Commencer le défi' : 'Continuer le défi'}
              </Link>
            )
          ) : (
            <div className="mt-3 rounded-2xl bg-heart/10 p-4 text-center">
              <p className="font-display text-sm font-bold text-heart">Plus de vies</p>
              <p className="mt-1 text-xs text-mute">Régénération en cours — {premium ? '1 vie/heure' : '1 vie/24h'}</p>
              {nextLifeAt && <p className="mt-1 text-xs font-bold text-heart">Prochaine vie dans {formatDelay(nextLifeAt)}</p>}
            </div>
          )}
        </div>

        {/* Aperçus */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/etudiant/duel" className={`${card} p-5 transition-transform active:scale-[0.98]`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-heart"><Icon name="swords" size={18} /> Duels</p>
              {activeDuels > 0 && <span className="rounded-full bg-heart px-2 py-0.5 text-[10px] font-bold text-white">{activeDuels} en cours</span>}
            </div>
            <p className="text-sm text-mute">{duelGrade.icon} {duelGrade.name} · {user.duelsWon}V / {user.duelsLost}D</p>
          </Link>
          <Link href="/etudiant/stats" className={`${card} p-5 transition-transform active:scale-[0.98]`}>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky"><Icon name="ecg" size={18} /> Progression</p>
            <p className="text-sm text-mute">{attemptsCount} cas résolus</p>
          </Link>
          <Link href="/etudiant/arene" className={`${card} p-5 transition-transform active:scale-[0.98]`}>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mala"><Icon name="stethoscope" size={18} /> Arène</p>
            <p className="text-sm text-mute">Défis, duels et séries</p>
          </Link>
        </div>

        {/* Tournoi mensuel */}
        <TournoiHomeCard userId={user.id} />

        {/* Top 3 du niveau */}
        <div className={`${card} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-ink"><Icon name="trophy" size={18} className="text-gold" /> Top 3 — {getNiveauLabel(user.anneeEtude)}</h2>
            <Link href="/etudiant/leaderboard?scope=niveau" className="text-xs font-bold text-mala">Voir tout →</Link>
          </div>
          {topUsers.length === 0 ? (
            <p className="py-3 text-center text-sm text-mute">Pas encore de classement dans ton niveau.</p>
          ) : (
            <div className="space-y-2">
              {topUsers.map((u, i) => (
                <Link key={u.id} href={`/etudiant/profil/${u.id}`}
                  className={`flex items-center gap-3 rounded-xl p-2 transition-colors ${u.id === user.id ? 'bg-mala/10' : 'hover:bg-slab-2'}`}>
                  <span className={`w-6 font-display text-sm font-extrabold ${i === 0 ? 'text-gold' : i === 1 ? 'text-mute' : 'text-flame'}`}>{i + 1}</span>
                  <GoldAvatar imageUrl={u.imageUrl} initials={`${u.prenom.charAt(0)}${u.nom.charAt(0)}`} passActive={u.passActive} frameKey={u.activeFrameId} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{nameOf(u)} {u.isPremium && '👑'} <LegendMark count={legends[u.id]} className="ml-1" /></p>
                    {getTitleDef(u.activeTitleId) && <div className="mt-0.5"><TitleBadge title={getTitleDef(u.activeTitleId)!} size="sm" /></div>}
                  </div>
                  <span className="flex items-center gap-1 font-display text-sm font-bold tabular-nums text-mala"><Icon name="star" size={14} /> {u.xp}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Espace Élite — découverte */}
        <Link href="/etudiant/monetise/pass" className={`relative block overflow-hidden rounded-3xl p-5 transition-transform active:scale-[0.98] ${user.passActive
          ? 'bg-gold text-stone shadow-[0_5px_0_#9a6a12]'
          : 'border-2 border-gold/40 bg-slab'}`}>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/10 animate-shimmer" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${user.passActive ? 'bg-stone/15' : 'bg-gold/15 text-gold'}`}><Icon name="shield" size={26} /></span>
              <div>
                <p className={`font-display text-sm font-extrabold ${user.passActive ? '' : 'text-gold'}`}>{user.passActive ? 'Espace Élite' : 'Pass Élite'}</p>
                <p className={`mt-0.5 text-xs ${user.passActive ? 'opacity-70' : 'text-mute'}`}>
                  {user.passActive
                    ? `Points de mérite : ${user.uaBalance.toLocaleString('fr-FR')} — entre dans ton espace`
                    : "Cas Élite, Rush du week-end, boutique et personnalisation"}
                </p>
              </div>
            </div>
            <span className="font-display text-lg font-extrabold">→</span>
          </div>
        </Link>

        {/* WhatsApp discret */}
        <a href="https://chat.whatsapp.com/I1LXEVHIA9d0YFRCzw2umk?s=cl&p=a&ilr=4" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-slab py-2.5 text-xs font-bold text-mute transition-colors hover:text-mala">
          <Icon name="chat" size={16} /> Rejoins la communauté WhatsApp
        </a>
      </HomeStagger>
    </div>
  );
}
