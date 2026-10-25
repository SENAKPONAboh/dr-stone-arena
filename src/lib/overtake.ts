// ===== « X VIENT DE TE DÉPASSER » : notification quand un étudiant passe devant d'autres au classement XP =====
// Appelé APRÈS un gain d'XP (via after() : la réponse à l'étudiant n'attend jamais).
// Le classement (Global, Mon niveau, Mon pays) est trié par XP : passer de xpBefore à xpAfter
// fait dépasser tous ceux dont l'XP est strictement entre les deux.
// Anti-spam : le même étudiant ne prévient pas deux fois la même personne dans la journée,
// et une personne reçoit au plus MAX_PER_DAY notifications de dépassement par jour.
import prisma from '@/lib/prisma';
import { pushOnly } from '@/lib/notify';

export const OVERTAKE_ICON = '🏁';
const MAX_VICTIMS = 30;   // au plus 30 personnes prévenues par gain (les plus proches)
const MAX_PER_DAY = 5;

const PHRASES = [
  'Un cas réussi et tu reprends ta place 💪',
  'Le diagnostic est clair : il faut riposter ! 🩺',
  'Garde ton sang-froid, ta revanche commence maintenant.',
  'Chaque cas compte : reviens dans la course !',
  'Les grands médecins ne lâchent jamais. À toi de jouer !',
  'Ton pouls s’accélère ? Transforme-le en XP ⚡',
  'Ta place t’attend : va la reprendre !',
  'Une garde de plus et tu repasses devant 🔥',
];

const rankLabel = (n: number) => (n === 1 ? '1er' : `${n}e`);

// Minuit à l'heure du Niger / Bénin (UTC+1)
function startOfLocalDay() {
  const now = new Date(Date.now() + 3600000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3600000);
}

export async function notifyOvertaken(
  overtaker: { id: string; prenom: string; pseudo: string | null; anneeEtude?: number | null },
  xpBefore: number,
  xpAfter: number,
) {
  if (!(xpAfter > xpBefore)) return;
  try {
    const victims = await prisma.user.findMany({
      where: { id: { not: overtaker.id }, role: 'ETUDIANT', statut: 'VALIDE', xp: { gt: xpBefore, lt: xpAfter } },
      orderBy: { xp: 'desc' },
      take: MAX_VICTIMS,
      select: { id: true, xp: true, anneeEtude: true },
    });
    if (victims.length === 0) return;

    const name = overtaker.pseudo || overtaker.prenom;
    const already = await prisma.notification.findMany({
      where: { userId: { in: victims.map(v => v.id) }, icon: OVERTAKE_ICON, createdAt: { gte: startOfLocalDay() } },
      select: { userId: true, message: true },
    });

    const targets = victims.filter(v => {
      const mine = already.filter(n => n.userId === v.id);
      return mine.length < MAX_PER_DAY && !mine.some(n => n.message.startsWith(`${name} vient`));
    });
    if (targets.length === 0) return;

    const notes = await Promise.all(targets.map(async v => {
      const rank = (await prisma.user.count({ where: { role: 'ETUDIANT', statut: 'VALIDE', xp: { gt: v.xp } } })) + 1;
      const promo = overtaker.anneeEtude && overtaker.anneeEtude === v.anneeEtude ? ' (même promo que toi)' : '';
      const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
      return { userId: v.id, message: `${name} vient de te dépasser au classement${promo} ! Tu es maintenant ${rankLabel(rank)}. ${phrase}` };
    }));

    await prisma.notification.createMany({ data: notes.map(n => ({ ...n, icon: OVERTAKE_ICON })) });
    for (let i = 0; i < notes.length; i += 20) {
      await Promise.all(notes.slice(i, i + 20).map(n =>
        pushOnly(n.userId, n.message, OVERTAKE_ICON, { title: '🏁 Tu viens d’être dépassé !', url: '/etudiant/leaderboard' }).catch(() => {})));
    }
  } catch (e) {
    console.error('notifyOvertaken', e); // jamais bloquant
  }
}
