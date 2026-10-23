'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INDICATIFS } from '@/lib/indicatifs';

type State = { enabled: boolean; phone: string | null; verified: boolean; link: string | null; code: string | null };

// Carte « Vérifie ton numéro WhatsApp » (accueil). Invisible tant que la vérification n'est pas branchée chez Meta,
// et une fois le numéro vérifié. Après le clic, elle surveille la vérification et se transforme toute seule.
export default function WhatsappVerifyCard() {
  const [st, setSt] = useState<State | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(INDICATIFS[0].code);
  const [local, setLocal] = useState('');
  const [err, setErr] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/whatsapp/status', { cache: 'no-store' });
      if (!r.ok) return;
      const d: State = await r.json();
      setSt(prev => {
        if (prev && !prev.verified && d.verified) setJustVerified(true);
        return d;
      });
      if (d.verified && timer.current) { clearInterval(timer.current); timer.current = null; }
    } catch { /* hors ligne : on réessaiera */ }
  }, []);

  useEffect(() => { load(); return () => { if (timer.current) clearInterval(timer.current); }; }, [load]);

  // Retour dans l'application après l'envoi du message : on revérifie tout de suite
  useEffect(() => {
    const onFocus = () => { if (waiting) load(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [waiting, load]);

  const startWaiting = () => {
    setWaiting(true);
    if (!timer.current) timer.current = setInterval(load, 4000);
    setTimeout(() => { if (timer.current) { clearInterval(timer.current); timer.current = null; } }, 5 * 60 * 1000);
  };

  const savePhone = async () => {
    setErr('');
    const r = await fetch('/api/whatsapp/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneCode: code, phoneLocal: local }) });
    const d = await r.json();
    if (!r.ok) { setErr(d?.error ?? 'Erreur'); return; }
    setSt(d); setEditing(false);
  };

  if (!st || !st.enabled) return null;

  if (st.verified) {
    if (!justVerified) return null;
    return (
      <div className="rounded-3xl border-2 border-mala/50 bg-mala/10 p-4 text-center">
        <p className="font-display text-sm font-extrabold text-mala">✓ Numéro WhatsApp vérifié !</p>
        <p className="mt-1 text-xs text-mute">Merci, ton compte est sécurisé.</p>
      </div>
    );
  }

  const input = 'w-full min-w-0 rounded-xl border border-line bg-slab-2 px-3 py-2.5 text-sm text-ink';

  return (
    <div className="rounded-3xl border-2 border-[#25d366]/50 bg-slab p-5">
      <p className="font-display text-sm font-extrabold text-ink">Vérifie ton numéro WhatsApp</p>
      {!st.phone || editing ? (
        <>
          <p className="mt-1 text-xs text-mute">Indique ton numéro WhatsApp actif (un seul compte par numéro).</p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2">
            <select value={code} onChange={e => setCode(e.target.value)} className={input} aria-label="Pays">
              {INDICATIFS.map(i => <option key={i.pays} value={i.code}>+{i.code} {i.pays}</option>)}
            </select>
            <input value={local} onChange={e => setLocal(e.target.value)} type="tel" inputMode="tel" placeholder="90 12 34 56" className={input} aria-label="Numéro" />
          </div>
          {err && <p className="mt-2 text-xs font-bold text-heart">{err}</p>}
          <button onClick={savePhone} className="mt-3 w-full rounded-2xl bg-mala py-3 font-display text-xs font-extrabold uppercase tracking-wide text-stone">Enregistrer</button>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            10 secondes : touche le bouton, WhatsApp s&apos;ouvre avec ton code déjà écrit, <b className="text-ink">envoie le message</b> et reviens ici.
            Numéro : <b className="text-ink">{st.phone}</b>{' '}
            <button onClick={() => setEditing(true)} className="font-bold text-sky underline underline-offset-2">modifier</button>
          </p>
          <a href={st.link ?? '#'} target="_blank" rel="noopener noreferrer" onClick={startWaiting}
            className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-[#25d366] font-display text-sm font-extrabold uppercase tracking-wide text-stone shadow-[0_5px_0_#128c4a] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#128c4a]">
            Vérifier mon numéro
          </a>
          {waiting && <p className="mt-2 text-center text-xs font-bold text-mute">En attente de ton message… (code {st.code})</p>}
          <p className="mt-2 text-[11px] text-mute">Envoie le message depuis <b>le numéro indiqué ci-dessus</b>, sans le modifier.</p>
        </>
      )}
    </div>
  );
}
