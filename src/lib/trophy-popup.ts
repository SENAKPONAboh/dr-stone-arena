// Fenêtres de trophée à afficher UNE fois à la connexion (ex. les 3 premiers de la Ligue Or).
// Stockées dans LeagueSetting (clé « popup:<nom> », valeur JSON) : aucune nouvelle table.
// Écrites par un script (scripts/trophee-or.mjs) ; chaque joueur est retiré de la liste quand il ferme la fenêtre.
import prisma from '@/lib/prisma';

export type TrophyPopup = { key: string; title: string; subtitle: string; xp: number; rank: number };
type Stored = { title: string; subtitle: string; xp: number; players: { id: string; rank: number }[] };

export async function getTrophyPopup(userId: string): Promise<TrophyPopup | null> {
  try {
    const rows = await prisma.leagueSetting.findMany({ where: { key: { startsWith: 'popup:' } } });
    for (const r of rows) {
      const v = JSON.parse(r.value) as Stored;
      const me = v.players?.find((p) => p.id === userId);
      if (me) return { key: r.key, title: v.title, subtitle: v.subtitle, xp: v.xp, rank: me.rank };
    }
  } catch { /* fenêtre facultative : ne jamais bloquer l'accueil */ }
  return null;
}

export async function markTrophyPopupSeen(userId: string, key: string) {
  if (!key.startsWith('popup:')) return;
  const r = await prisma.leagueSetting.findUnique({ where: { key } });
  if (!r) return;
  const v = JSON.parse(r.value) as Stored;
  const players = (v.players ?? []).filter((p) => p.id !== userId);
  if (players.length === 0) await prisma.leagueSetting.delete({ where: { key } });
  else await prisma.leagueSetting.update({ where: { key }, data: { value: JSON.stringify({ ...v, players }) } });
}
