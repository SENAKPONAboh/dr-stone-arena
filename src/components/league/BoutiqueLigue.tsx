'use client';

import { useState } from 'react';
import GoldAvatar from '@/components/ui/GoldAvatar';

type Item = { id: string; name: string; category: string; priceUA: number; icon: string | null; effectKey: string | null; description: string | null };
type Props = {
  initialUa: number;
  items: Item[];
  owned: Record<string, number>;
  equipped: { CADRE: string | null; TITRE: string | null; THEME: string | null };
  premium: { amount: number; claimed: boolean };
  earn: { chestByTier: number[]; star: number; duelWin: number; duelLoss: number; premium: Record<number, number> };
  user: { imageUrl: string | null; initials: string };
};

const SECTIONS: { cat: string; title: string; hint: string }[] = [
  { cat: 'CADRE', title: 'Cadres animés', hint: 'Autour de ta photo, partout dans l’appli' },
  { cat: 'TITRE', title: 'Titres', hint: 'Affichés avec ton pseudo' },
  { cat: 'THEME', title: 'Thèmes', hint: 'L’apparence de ton profil' },
  { cat: 'FLAMME', title: 'Protections de Flamme', hint: 'Pour ne pas perdre ta série' },
];
const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');

export default function BoutiqueLigue({ initialUa, items, owned: initialOwned, equipped: initialEquipped, premium, earn, user }: Props) {
  const [ua, setUa] = useState(initialUa);
  const [owned, setOwned] = useState(initialOwned);
  const [equipped, setEquipped] = useState(initialEquipped);
  const [premiumClaimed, setPremiumClaimed] = useState(premium.claimed);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

  const post = async (url: string, body?: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur');
    return data;
  };

  const buy = async (it: Item) => {
    setBusy(it.id);
    try {
      const d = await post('/api/boutique/purchase', { itemId: it.id });
      setUa(d.ua);
      setOwned((o) => ({ ...o, [it.id]: (o[it.id] ?? 0) + 1 }));
      say(true, `${it.name} acheté !`);
    } catch (e: any) { say(false, e.message); } finally { setBusy(''); }
  };
  const equip = async (it: Item, on: boolean) => {
    setBusy(it.id);
    try {
      await post('/api/monetise/personnalisation/equip', { itemId: it.id, action: on ? 'EQUIP' : 'UNEQUIP' });
      setEquipped((e) => ({ ...e, [it.category]: on ? it.effectKey : null }));
      say(true, on ? `${it.name} équipé !` : 'Retiré.');
    } catch (e: any) { say(false, e.message); } finally { setBusy(''); }
  };
  const use = async (it: Item) => {
    setBusy(it.id);
    try {
      await post('/api/monetise/shop/use', { itemId: it.id });
      setOwned((o) => ({ ...o, [it.id]: Math.max(0, (o[it.id] ?? 1) - 1) }));
      say(true, `${it.name} activé !`);
    } catch (e: any) { say(false, e.message); } finally { setBusy(''); }
  };
  const claimPremium = async () => {
    setBusy('premium');
    try {
      const d = await post('/api/boutique/premium');
      setUa(d.ua); setPremiumClaimed(true);
      say(true, `+${fmt(d.amount)} UA ajoutées !`);
    } catch (e: any) { say(false, e.message); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      {/* Solde */}
      <div className="flex items-center gap-4 rounded-3xl border border-gold/40 bg-slab p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#fff3c9] bg-gradient-to-br from-[#fff3c9] via-gold to-[#9a6a12] font-display text-sm font-extrabold text-[#5a3d06]">UA</span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Mes UA</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-gold">{fmt(ua)}</p>
          <p className="text-[11px] text-mute">À dépenser dans la boutique · jamais converties en argent</p>
        </div>
      </div>

      {/* Coffre Premium */}
      <div className="rounded-3xl border border-sky/40 bg-slab p-4">
        <p className="font-display text-sm font-extrabold text-sky">Coffre Premium du mois</p>
        {premium.amount > 0 ? (
          premiumClaimed
            ? <p className="mt-1 text-sm text-mute">Déjà ouvert ce mois-ci. Le prochain arrive le 1er du mois.</p>
            : <button onClick={claimPremium} disabled={busy === 'premium'} className="mt-2 w-full rounded-2xl bg-sky px-4 py-3 font-display text-sm font-bold uppercase text-stone shadow-[0_5px_0_#1d6fa0] active:translate-y-1 active:shadow-[0_1px_0_#1d6fa0]">
                Ouvrir mon coffre : +{fmt(premium.amount)} UA
              </button>
        ) : (
          <p className="mt-1 text-sm text-mute">Les membres Premium reçoivent chaque mois des UA offertes : {fmt(earn.premium[1])} (I), {fmt(earn.premium[2])} (II), {fmt(earn.premium[3])} (III).</p>
        )}
      </div>

      {/* Comment gagner des UA */}
      <div className="rounded-3xl border border-line bg-slab p-4">
        <p className="font-display text-sm font-extrabold">Comment gagner des UA</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex justify-between gap-2"><span>Monter de ligue (coffre)</span><b className="text-gold">{fmt(earn.chestByTier[1])} à {fmt(earn.chestByTier[5])}</b></li>
          <li className="flex justify-between gap-2"><span>Gagner une étoile (coffre)</span><b className="text-gold">{fmt(earn.star)}</b></li>
          <li className="flex justify-between gap-2"><span>Duel après les 3 du jour</span><b className="text-gold">+{earn.duelWin} gagné · +{earn.duelLoss} perdu</b></li>
          <li className="flex justify-between gap-2"><span>Coffre Premium du mois</span><b className="text-gold">jusqu’à {fmt(earn.premium[3])}</b></li>
        </ul>
      </div>

      {SECTIONS.map((sec) => {
        const list = items.filter((i) => i.category === sec.cat);
        if (!list.length) return null;
        return (
          <section key={sec.cat} className="rounded-3xl border border-line bg-slab p-4">
            <h2 className="font-display text-sm font-extrabold">{sec.title}</h2>
            <p className="mb-3 text-xs text-mute">{sec.hint}</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {list.map((it) => {
                const qty = owned[it.id] ?? 0;
                const isOn = sec.cat !== 'FLAMME' && equipped[sec.cat as 'CADRE' | 'TITRE' | 'THEME'] === it.effectKey;
                const canBuy = ua >= it.priceUA;
                return (
                  <div key={it.id} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center ${isOn ? 'border-mala bg-mala/10' : 'border-line bg-slab-2'}`}>
                    {sec.cat === 'CADRE'
                      ? <GoldAvatar imageUrl={user.imageUrl} initials={user.initials} frameKey={it.effectKey} size={56} />
                      : <span className="text-3xl">{it.icon ?? '🎁'}</span>}
                    <p className="text-xs font-bold leading-tight">{it.name}</p>
                    {sec.cat === 'FLAMME' && qty > 0 && <p className="text-[10px] font-bold text-mala">En stock : {qty}</p>}
                    {sec.cat !== 'FLAMME' && qty > 0 ? (
                      <button onClick={() => equip(it, !isOn)} disabled={busy === it.id}
                        className={`mt-auto w-full rounded-xl px-2 py-2 text-[11px] font-bold ${isOn ? 'bg-slab text-mute' : 'bg-mala text-stone'}`}>
                        {isOn ? 'Retirer' : 'Équiper'}
                      </button>
                    ) : (
                      <div className="mt-auto w-full space-y-1">
                        <button onClick={() => buy(it)} disabled={busy === it.id || !canBuy}
                          className={`w-full rounded-xl px-2 py-2 text-[11px] font-bold ${canBuy ? 'bg-gold text-stone' : 'bg-slab text-mute'}`}>
                          {fmt(it.priceUA)} UA
                        </button>
                        {sec.cat === 'FLAMME' && qty > 0 && (
                          <button onClick={() => use(it)} disabled={busy === it.id} className="w-full rounded-xl bg-flame px-2 py-2 text-[11px] font-bold text-stone">Utiliser</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg ${toast.ok ? 'bg-mala text-stone' : 'bg-heart text-white'}`}>{toast.text}</div>
      )}
    </div>
  );
}
