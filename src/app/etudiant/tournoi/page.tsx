import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getNiveauLabel } from '@/lib/niveau';
import { seasonLabel } from '@/lib/seasons';
import { tournoiPhase, PHASE_LABEL, readAnswers, TOURNOI_FINALISTS } from '@/lib/tournoi';
import Countdown from '@/components/tournoi/Countdown';
import ArenaButton from '@/components/ui/ArenaButton';

const dateFr = (d: Date) => d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });

export default async function TournoiPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/api/auth/logout');
  if (user.role !== 'ETUDIANT') redirect('/login');

  // Où en est l'étudiant dans la course à la qualification (top 10 de sa promotion, XP du mois) ?
  const myRank = user.anneeEtude
    ? (await prisma.user.count({ where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude, xp: { gt: user.xp } } })) + 1
    : null;
  const tenth = user.anneeEtude
    ? await prisma.user.findMany({ where: { role: 'ETUDIANT', statut: 'VALIDE', anneeEtude: user.anneeEtude }, orderBy: { xp: 'desc' }, skip: TOURNOI_FINALISTS - 1, take: 1, select: { xp: true } })
    : [];
  const gap = myRank && myRank > TOURNOI_FINALISTS && tenth[0] ? Math.max(1, tenth[0].xp - user.xp + 1) : 0;

  // Tournois publiés ou terminés (tolérant si les tables n'existent pas encore)
  let tournaments: any[] = [];
  let ready = true;
  try {
    tournaments = await prisma.tournament.findMany({
      where: { status: { in: ['PUBLIE', 'TERMINE'] } },
      orderBy: [{ opensAt: 'desc' }],
      take: 14,
      include: { entries: { orderBy: { seed: 'asc' }, include: { user: { select: { id: true, prenom: true, nom: true, pseudo: true } } } } },
    });
  } catch {
    ready = false;
  }

  const mine = tournaments.find(t => t.entries.some((e: any) => e.userId === user.id) && t.status === 'PUBLIE');
  const myEntry = mine?.entries.find((e: any) => e.userId === user.id);
  const myPhase = mine ? tournoiPhase(mine) : null;
  const myDone = myEntry ? (!!myEntry.finishedAt || myEntry.currentIndex >= mine.caseIds.length) : false;

  const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-slab p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-4xl">🏆</div>
        <h1 className="font-display text-xl font-black text-ink">Tournoi mensuel</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mute">
          À la fin de chaque mois, les {TOURNOI_FINALISTS} premiers de chaque promotion jouent 20 cas inédits, une seule fois, pendant 48 h.
          Le meilleur devient <b className="text-ink">Champion de promotion</b>. Tout le monde peut suivre les résultats.
        </p>
      </section>

      {!ready && (
        <p className="rounded-2xl border border-line bg-slab p-4 text-center text-sm text-mute">Le tournoi n'est pas encore activé. Reviens bientôt !</p>
      )}

      {/* Mon tournoi */}
      {mine && myEntry && (
        <section className="rounded-3xl border-2 border-gold/60 bg-gold/10 p-6 text-center shadow-[0_0_30px_rgb(var(--gold-rgb)/0.2)]">
          <p className="font-display text-xs font-extrabold uppercase tracking-[0.25em] text-gold">Tu es finaliste !</p>
          <h2 className="mt-1 font-display text-lg font-black text-ink">Tournoi {getNiveauLabel(mine.anneeEtude)} · {seasonLabel(mine.season)}</h2>
          <p className="mt-1 text-sm text-mute">Qualifié n°{myEntry.seed} de ta promotion</p>

          {myPhase === 'A_VENIR' && (
            <p className="mt-4 text-sm text-ink">Ouverture <b>{dateFr(mine.opensAt)}</b><br /><Countdown to={mine.opensAt.toISOString()} prefix="Dans " className="font-display text-xl font-extrabold text-gold" /></p>
          )}
          {myPhase === 'EN_COURS' && !myDone && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-ink">Ferme <b>{dateFr(mine.closesAt)}</b> · <Countdown to={mine.closesAt.toISOString()} prefix="il reste " className="font-bold text-gold" /></p>
              <Link href="/etudiant/tournoi/jouer" className="block">
                <ArenaButton full variant="gold">{myEntry.currentIndex > 0 ? `Reprendre (cas ${myEntry.currentIndex + 1}/${mine.caseIds.length})` : 'Jouer le tournoi'}</ArenaButton>
              </Link>
              <p className="text-xs text-mute">Une seule tentative · {mine.caseIds.length} cas · chrono mesuré par le serveur</p>
            </div>
          )}
          {myPhase === 'EN_COURS' && myDone && (
            <p className="mt-4 text-sm text-ink">✅ Tu as terminé ! Résultats et corrections après la clôture ({dateFr(mine.closesAt)}).</p>
          )}
          {myPhase === 'FERME' && <p className="mt-4 text-sm text-ink">La fenêtre est fermée. Les résultats arrivent bientôt.</p>}
        </section>
      )}

      {/* Qualification */}
      {user.anneeEtude && myRank && !mine && (
        <section className="rounded-3xl border border-line bg-slab p-5 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-mute">Ta qualification · {getNiveauLabel(user.anneeEtude)}</p>
          <p className="mt-2 font-display text-3xl font-black text-ink">n°{myRank}</p>
          <p className="mt-1 text-sm text-mute">
            {myRank <= TOURNOI_FINALISTS
              ? <>Tu es dans le top {TOURNOI_FINALISTS} : <b className="text-mala">tu serais qualifié</b> si le mois se terminait maintenant. Garde ta place !</>
              : <>Il te manque environ <b className="text-ink">{gap.toLocaleString('fr-FR')} XP</b> pour entrer dans le top {TOURNOI_FINALISTS}.</>}
          </p>
          <Link href="/etudiant/leaderboard?scope=niveau" className="mt-3 inline-block text-xs font-bold text-mala">Voir le classement de ma promotion →</Link>
        </section>
      )}

      {/* Tournois */}
      {ready && tournaments.length === 0 && (
        <section className="rounded-3xl border border-line bg-slab p-6 text-center text-sm text-mute">
          Aucun tournoi pour le moment. Le prochain réunira les {TOURNOI_FINALISTS} premiers de chaque promotion juste après la clôture du mois.
        </section>
      )}

      {tournaments.map(t => {
        const phase = tournoiPhase(t);
        const done = phase === 'TERMINE';
        const entries = done ? [...t.entries].sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99)) : t.entries;
        return (
          <section key={t.id} className="rounded-3xl border border-line bg-slab p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-extrabold text-ink">{getNiveauLabel(t.anneeEtude)} · {seasonLabel(t.season)}</h2>
                <p className="text-xs text-mute">{dateFr(t.opensAt)} → {dateFr(t.closesAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${phase === 'EN_COURS' ? 'bg-mala/15 text-mala' : done ? 'bg-gold/15 text-gold' : 'bg-slab-2 text-mute'}`}>{PHASE_LABEL[phase]}</span>
            </div>
            {t.prize && <p className="mt-2 rounded-xl bg-gold/10 px-3 py-2 text-xs font-bold text-gold">🎁 {t.prize}</p>}

            <div className="mt-3 space-y-1.5">
              {entries.map((e: any) => {
                const answered = readAnswers(e.answers).length;
                const isMe = e.userId === user.id;
                return (
                  <div key={e.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isMe ? 'border border-mala/50 bg-mala/10' : 'bg-slab-2'}`}>
                    <span className={`w-6 text-center font-display text-sm font-extrabold ${done && e.rank === 1 ? 'text-gold' : 'text-mute'}`}>
                      {done ? (e.rank === 1 && e.score > 0 ? '👑' : e.rank) : e.seed}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold text-ink">{nameOf(e.user)}{isMe ? ' (toi)' : ''}</span>
                    {done ? (
                      <span className="whitespace-nowrap text-xs font-bold text-ink">{e.score}/{t.caseIds.length} · {Math.floor(e.totalTime / 60)}′{String(e.totalTime % 60).padStart(2, '0')}″</span>
                    ) : (
                      <span className="text-xs text-mute">{e.finishedAt ? '✓ a joué' : answered > 0 ? 'en cours' : 'pas encore'}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {done && (
              <Link href={`/etudiant/tournoi/correction/${t.id}`} className="mt-3 inline-block text-xs font-bold text-mala">Voir toutes les corrections →</Link>
            )}
          </section>
        );
      })}
    </div>
  );
}
