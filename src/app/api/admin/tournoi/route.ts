import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminOrNull } from '@/lib/auth';
import { getNiveauLabel } from '@/lib/niveau';
import { seasonLabel } from '@/lib/seasons';
import { sendPushToUser } from '@/lib/push';
import { getOrCreatePersonalisationCatalog } from '@/lib/personnalisation';
import { TOURNOI_CASES, TOURNOI_FINALISTS, getReservedCaseIds, rankEntries, tournoiPhase } from '@/lib/tournoi';

// 🏆 ADMINISTRATION DU TOURNOI MENSUEL : créer (depuis une saison clôturée) → publier → clôturer.
// Actions : create | publish | finish | delete

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const dateFr = (d: Date) => d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });

export async function POST(request: Request) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const body = await request.json();

    // ============ CRÉER ============
    if (body.action === 'create') {
      const season = String(body.season ?? '');
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(season)) return NextResponse.json({ error: 'Mois invalide.' }, { status: 400 });
      const levels: number[] = Array.isArray(body.anneeEtudes) ? body.anneeEtudes.map(Number).filter((n: number) => n >= 1 && n <= 7) : [];
      if (levels.length === 0) return NextResponse.json({ error: 'Choisis au moins une promotion.' }, { status: 400 });
      const opensAt = new Date(body.opensAt);
      const closesAt = new Date(body.closesAt);
      if (isNaN(opensAt.getTime()) || isNaN(closesAt.getTime())) return NextResponse.json({ error: 'Dates invalides.' }, { status: 400 });
      if (closesAt.getTime() - opensAt.getTime() < 6 * 3600 * 1000) return NextResponse.json({ error: 'La fenêtre doit durer au moins 6 heures.' }, { status: 400 });
      const prize = typeof body.prize === 'string' && body.prize.trim() ? body.prize.trim().slice(0, 200) : null;
      const allowFew = !!body.allowFewUnseen;

      const reserved = new Set(await getReservedCaseIds());
      const results: { level: number; label: string; status: 'created' | 'skipped'; message: string }[] = [];

      for (const level of levels) {
        const label = getNiveauLabel(level);
        const exists = await prisma.tournament.findUnique({ where: { season_anneeEtude: { season, anneeEtude: level } } });
        if (exists) { results.push({ level, label, status: 'skipped', message: 'Déjà créé pour ce mois.' }); continue; }

        const finalists = await prisma.seasonResult.findMany({
          where: { season, xp: { gt: 0 }, user: { anneeEtude: level, role: 'ETUDIANT', statut: 'VALIDE' } },
          orderBy: { xp: 'desc' },
          take: TOURNOI_FINALISTS,
          select: { userId: true },
        });
        if (finalists.length < 2) { results.push({ level, label, status: 'skipped', message: `Pas assez de finalistes (${finalists.length}). Il faut au moins 2 joueurs ayant des XP ce mois-là.` }); continue; }

        const cases = await prisma.clinicalCase.findMany({ where: { anneeEtude: level }, select: { id: true } });
        const pool = cases.filter(c => !reserved.has(c.id));
        if (pool.length < TOURNOI_CASES) { results.push({ level, label, status: 'skipped', message: `Pas assez de cas pour cette promotion (${pool.length} disponibles, ${TOURNOI_CASES} requis).` }); continue; }

        // Cas inédits : jamais vus par aucun finaliste (classique, Élite ou Rush)
        const ids = finalists.map(f => f.userId);
        const [a1, a2, rush] = await Promise.all([
          prisma.attempt.findMany({ where: { userId: { in: ids } }, select: { clinicalCaseId: true }, distinct: ['clinicalCaseId'] }),
          prisma.monetiseAttempt.findMany({ where: { userId: { in: ids } }, select: { clinicalCaseId: true }, distinct: ['clinicalCaseId'] }),
          prisma.rushSession.findMany({ where: { userId: { in: ids } }, select: { playedCaseIds: true } }),
        ]);
        const seen = new Set<string>([...a1.map(a => a.clinicalCaseId), ...a2.map(a => a.clinicalCaseId), ...rush.flatMap(r => r.playedCaseIds)]);
        const unseen = pool.filter(c => !seen.has(c.id));

        if (unseen.length < TOURNOI_CASES && !allowFew) {
          results.push({ level, label, status: 'skipped', message: `Seulement ${unseen.length} cas inédits sur ${TOURNOI_CASES} nécessaires. Ajoute des cas pour cette promotion, ou coche « autoriser des cas déjà vus ».` });
          continue;
        }
        const chosen = unseen.length >= TOURNOI_CASES
          ? shuffle(unseen).slice(0, TOURNOI_CASES)
          : [...shuffle(unseen), ...shuffle(pool.filter(c => seen.has(c.id)))].slice(0, TOURNOI_CASES);

        await prisma.tournament.create({
          data: {
            season, anneeEtude: level, title: `Tournoi ${label} — ${seasonLabel(season)}`, status: 'BROUILLON',
            caseIds: chosen.map(c => c.id), opensAt, closesAt, prize,
            entries: { create: finalists.map((f, i) => ({ userId: f.userId, seed: i + 1 })) },
          },
        });
        results.push({ level, label, status: 'created', message: `${finalists.length} finalistes, ${TOURNOI_CASES} cas (${Math.min(unseen.length, TOURNOI_CASES)} inédits).` });
      }
      return NextResponse.json({ success: true, results });
    }

    // ============ PUBLIER ============
    if (body.action === 'publish') {
      const t = await prisma.tournament.findUnique({ where: { id: String(body.id ?? '') }, include: { entries: true } });
      if (!t) return NextResponse.json({ error: 'Tournoi introuvable.' }, { status: 404 });
      if (t.status !== 'BROUILLON') return NextResponse.json({ error: 'Ce tournoi est déjà publié.' }, { status: 400 });
      await prisma.tournament.update({ where: { id: t.id }, data: { status: 'PUBLIE' } });

      const message = `🏆 Tu es finaliste du ${t.title} ! Il ouvre ${dateFr(t.opensAt)} et ferme ${dateFr(t.closesAt)}. 20 cas inédits, une seule tentative.`;
      await prisma.notification.createMany({ data: t.entries.map(e => ({ userId: e.userId, message, icon: '🏆' })) });
      await Promise.all(t.entries.map(e => sendPushToUser(e.userId, { title: '🏆 Tu es finaliste !', body: `${t.title} — ouvre ${dateFr(t.opensAt)}`, url: '/etudiant/tournoi' })));
      return NextResponse.json({ success: true });
    }

    // ============ CLÔTURER ET PUBLIER LES RÉSULTATS ============
    if (body.action === 'finish') {
      const t = await prisma.tournament.findUnique({ where: { id: String(body.id ?? '') }, include: { entries: true } });
      if (!t) return NextResponse.json({ error: 'Tournoi introuvable.' }, { status: 404 });
      if (t.status === 'TERMINE') return NextResponse.json({ error: 'Résultats déjà publiés.' }, { status: 400 });
      if (t.status !== 'PUBLIE') return NextResponse.json({ error: "Publie d'abord le tournoi." }, { status: 400 });
      if (tournoiPhase(t) !== 'FERME' && !body.force) return NextResponse.json({ error: "La fenêtre de jeu n'est pas encore terminée.", needsForce: true }, { status: 409 });

      const ranked = rankEntries(t.entries.map(e => ({ ...e })));
      await prisma.$transaction(async (tx) => {
        for (const e of ranked) {
          await tx.tournamentEntry.update({ where: { id: e.id }, data: { rank: e.rank, finishedAt: e.finishedAt ?? new Date() } });
        }
        await tx.tournament.update({ where: { id: t.id }, data: { status: 'TERMINE' } });
      });

      // Titre exclusif « Champion de Promotion » pour le(s) vainqueur(s) qui ont répondu à au moins un cas
      const champions = ranked.filter(e => e.rank === 1 && e.score > 0);
      if (champions.length > 0) {
        await getOrCreatePersonalisationCatalog(); // s'assure que le titre existe dans la boutique (inactif : non achetable)
        const titleItem = await prisma.shopItem.findFirst({ where: { name: 'Champion de Promotion', category: 'TITRE' } });
        if (titleItem) {
          for (const c of champions) {
            await prisma.userInventory.upsert({
              where: { userId_itemId: { userId: c.userId, itemId: titleItem.id } },
              create: { userId: c.userId, itemId: titleItem.id, quantity: 1 },
              update: {},
            });
            await prisma.user.updateMany({ where: { id: c.userId, activeTitleId: null }, data: { activeTitleId: 'TITRE_CHAMPION_PROMO' } });
          }
        }
      }

      await prisma.notification.createMany({
        data: ranked.map(e => ({
          userId: e.userId, icon: e.rank === 1 && e.score > 0 ? '👑' : '🏆',
          message: e.rank === 1 && e.score > 0
            ? `👑 Tu es CHAMPION DE PROMOTION (${t.title}) avec ${e.score}/${t.caseIds.length} ! Le titre exclusif est sur ton profil.`
            : `🏆 Résultats du ${t.title} : tu termines n°${e.rank} avec ${e.score}/${t.caseIds.length}. Corrections disponibles dans l'onglet Tournoi.`,
        })),
      });
      await Promise.all(ranked.map(e => sendPushToUser(e.userId, { title: '🏆 Résultats du tournoi', body: `Tu termines n°${e.rank} (${e.score}/${t.caseIds.length}).`, url: '/etudiant/tournoi' })));
      return NextResponse.json({ success: true, champions: champions.length });
    }

    // ============ SUPPRIMER (brouillon uniquement) ============
    if (body.action === 'delete') {
      const t = await prisma.tournament.findUnique({ where: { id: String(body.id ?? '') } });
      if (!t) return NextResponse.json({ error: 'Tournoi introuvable.' }, { status: 404 });
      if (t.status !== 'BROUILLON') return NextResponse.json({ error: 'Seul un brouillon peut être supprimé.' }, { status: 400 });
      await prisma.tournament.delete({ where: { id: t.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (e: any) {
    if (e?.code === 'P2021' || /Tournament/.test(String(e?.message))) {
      return NextResponse.json({ error: "Les tables du tournoi n'existent pas encore. Exécute d'abord : npx.cmd prisma db execute --file prisma/sql/2026-tournoi.sql" }, { status: 500 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
