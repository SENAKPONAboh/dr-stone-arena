import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/push';
import prisma from '@/lib/prisma';
import { getCurrentUserCore } from '@/lib/auth';
import { CASES_PER_DUEL, INVITE_EXPIRY_HOURS } from '@/lib/duel';
import { getEffectiveDuelQuota } from '@/lib/decouverte';
import { getSeenCases, pickUnseenFirst } from '@/lib/seen-cases';
import { getReservedCaseIds } from '@/lib/tournoi';

export async function POST(request: Request) {
  const user = await getCurrentUserCore();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { opponentId } = await request.json();
    if (!opponentId) return NextResponse.json({ error: "Adversaire manquant" }, { status: 400 });
    if (opponentId === user.id) return NextResponse.json({ error: "Tu ne peux pas te défier toi-même." }, { status: 400 });

    // 1. Premium obligatoire (demandeur)
    const quota = getEffectiveDuelQuota(user); // Premium ou Découverte 7 jours
    if (quota === 0) return NextResponse.json({ error: "Les duels sont réservés aux membres Premium." }, { status: 403 });

    // 2. Adversaire
    const opponent = await prisma.user.findUnique({
      where: { id: opponentId },
      select: { id: true, prenom: true, nom: true, role: true, anneeEtude: true, isPremium: true, premiumTier: true, createdAt: true }
    });
    if (!opponent || opponent.role !== 'ETUDIANT') {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // 3. Adversaire Premium (ou en Découverte 7 jours) obligatoire (règle validée)
    if (getEffectiveDuelQuota(opponent) === 0) {
      return NextResponse.json({ error: "Cet étudiant n'a pas accès aux duels (Premium uniquement)." }, { status: 400 });
    }

    // 4. Toutes les promotions (réforme du 16 nov. 2026) : il faut seulement que chacun ait renseigné son année.
    //    Chaque joueur joue les cas de SON année, de même difficulté ; départage : bonnes réponses puis temps.
    if (!user.anneeEtude || !opponent.anneeEtude) {
      return NextResponse.json({ error: "L'année d'études doit être renseignée pour jouer un duel." }, { status: 400 });
    }
    const myYear = user.anneeEtude, oppYear = opponent.anneeEtude;
    const crossYear = myYear !== oppYear;

    // 5. Quota du demandeur (duels ACCEPTÉS aujourd'hui uniquement)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const duelsToday = await prisma.duel.count({
      where: {
        OR: [{ requesterId: user.id }, { opponentId: user.id }],
        status: { in: ['ACCEPTE', 'TERMINE'] },
        acceptedAt: { gte: todayStart }
      }
    });
    if (duelsToday >= quota) {
      return NextResponse.json({ error: `Tu as atteint ta limite de ${quota} duels aujourd'hui.` }, { status: 429 });
    }

    // 6. Pas de duel déjà actif entre les deux
    const activeDuel = await prisma.duel.findFirst({
      where: {
        OR: [
          { requesterId: user.id, opponentId },
          { requesterId: opponentId, opponentId: user.id }
        ],
        status: { in: ['EN_ATTENTE', 'ACCEPTE'] }
      }
    });
    if (activeDuel) return NextResponse.json({ error: "Un duel est déjà en cours avec cet étudiant." }, { status: 400 });

    // 7. Banque de cas du niveau commun (cas déjà publiés = toute la banque)
    const eligibleCases = await prisma.clinicalCase.findMany({
      where: { anneeEtude: myYear },
      select: { id: true, difficulty: true }
    });
    if (eligibleCases.length < CASES_PER_DUEL) {
      return NextResponse.json({ error: `Pas encore assez de cas publiés pour ton niveau (${eligibleCases.length}/${CASES_PER_DUEL}). Reviens bientôt !` }, { status: 400 });
    }
    const oppCases = crossYear
      ? await prisma.clinicalCase.findMany({ where: { anneeEtude: oppYear }, select: { id: true, difficulty: true } })
      : [];
    if (crossYear && oppCases.length < CASES_PER_DUEL) {
      return NextResponse.json({ error: `Pas encore assez de cas publiés pour le niveau de ton adversaire (${oppCases.length}/${CASES_PER_DUEL}).` }, { status: 400 });
    }

    // 8. Tirage de 5 cas identiques pour les deux joueurs : d'abord des cas que NI L'UN NI L'AUTRE n'a jamais vus
    //    (garde, Élite, duels, Rush), en évitant aussi les cas de leur garde du jour, de leurs invitations en attente
    //    et ceux réservés à un tournoi.
    //    Un cas déjà vu ne revient que si la banque de l'année est épuisée (les plus anciens d'abord).
    const seen = await getSeenCases([user.id, opponentId]);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const [todayDaily, todayElite, reserved, pendingDuels] = await Promise.all([
      prisma.dailyCaseSelection.findMany({ where: { userId: { in: [user.id, opponentId] }, date: { gte: dayStart } }, select: { caseIds: true } }),
      prisma.monetiseSelection.findMany({ where: { userId: { in: [user.id, opponentId] }, date: { gte: dayStart } }, select: { caseIds: true } }).catch(() => []),
      getReservedCaseIds(),
      // Invitations encore en attente de l'un ou l'autre joueur : sans ça, deux défis envoyés coup sur coup
      // pouvaient tirer les mêmes cas (constaté le 19 nov. 2026 : plus de la moitié des cas répétés).
      prisma.duel.findMany({
        where: { status: 'EN_ATTENTE', OR: [{ requesterId: { in: [user.id, opponentId] } }, { opponentId: { in: [user.id, opponentId] } }] },
        select: { caseIds: true },
      }),
    ]);
    const now = Date.now();
    for (const s of [...todayDaily, ...todayElite, ...pendingDuels]) for (const c of s.caseIds) if (!seen.has(c)) seen.set(c, now);
    const notReserved = eligibleCases.filter(c => !reserved.includes(c.id));
    const myIds = pickUnseenFirst(notReserved.length >= CASES_PER_DUEL ? notReserved : eligibleCases, seen, CASES_PER_DUEL);
    let caseIds = myIds;
    if (crossYear) {
      // Pour chaque cas du demandeur : un cas de l'année de l'adversaire de MÊME difficulté (jamais vu d'abord, sinon le plus ancien)
      const oppPool = oppCases.filter(c => !reserved.includes(c.id));
      const pool = oppPool.length >= CASES_PER_DUEL ? oppPool : oppCases;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const ordered = [...shuffled.filter(c => !seen.has(c.id)), ...shuffled.filter(c => seen.has(c.id)).sort((a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0))];
      const diffOf = new Map(eligibleCases.map(c => [c.id, c.difficulty]));
      const used = new Set<string>();
      const oppIds = myIds.map(id => {
        const want = diffOf.get(id);
        const hit = ordered.find(c => !used.has(c.id) && c.difficulty === want) ?? ordered.find(c => !used.has(c.id));
        used.add(hit!.id);
        return hit!.id;
      });
      caseIds = [...myIds, ...oppIds];
    }

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const duel = await prisma.duel.create({
      data: { requesterId: user.id, opponentId, anneeEtude: myYear, caseIds, status: 'EN_ATTENTE', expiresAt }
    });

    // Notification (cloche) — la bannière géante s'affiche via le dashboard
    await prisma.notification.create({
      data: {
        userId: opponentId,
        message: `${user.pseudo || `${user.prenom} ${user.nom}`} te défie en duel ! ⚔️`,
        icon: '⚔️'
      }
    });

    // Alerte sur le téléphone de l'adversaire (si il a activé les notifications) — jamais bloquant
    await sendPushToUser(opponentId, {
      title: '⚔️ Défi de duel !',
      body: `${user.pseudo || `${user.prenom} ${user.nom}`} te défie en duel. Réponds avant l'expiration !`,
      url: '/etudiant',
    });

    return NextResponse.json({ success: true, duelId: duel.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}