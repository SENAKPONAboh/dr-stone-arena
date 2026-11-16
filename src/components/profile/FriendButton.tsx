'use client';

// Bouton d'amitié sur le profil d'un étudiant : inviter, annuler, accepter / refuser, ou ouvrir la discussion.
// S'appuie sur /api/friends (REQUEST, CANCEL, ACCEPT, REFUSE) : aucune nouvelle table.
import { useState } from 'react';
import Link from 'next/link';

export type FriendState = { status: 'NONE' | 'SENT' | 'RECEIVED' | 'FRIENDS'; friendshipId?: string };

const base = 'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-sm transition-transform active:scale-95 disabled:opacity-60';

const UserPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" /><path d="M19 8v6M16 11h6" /></svg>
);
const Chat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
);

export default function FriendButton({ targetId, targetName, initial }: { targetId: string; targetName: string; initial: FriendState }) {
  const [state, setState] = useState<FriendState>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const call = async (body: Record<string, unknown>) => {
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || 'Une erreur est survenue.'); return false; }
      return true;
    } finally { setBusy(false); }
  };

  const request = async () => {
    if (await call({ action: 'REQUEST', userId: targetId })) { setState({ status: 'SENT' }); setMsg(`Invitation envoyée à ${targetName} !`); }
  };
  const cancel = async () => {
    if (!state.friendshipId) { setMsg('Recharge la page pour annuler.'); return; }
    if (await call({ action: 'CANCEL', friendshipId: state.friendshipId })) setState({ status: 'NONE' });
  };
  const respond = async (action: 'ACCEPT' | 'REFUSE') => {
    if (await call({ action, friendshipId: state.friendshipId })) setState({ status: action === 'ACCEPT' ? 'FRIENDS' : 'NONE' });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {state.status === 'NONE' && (
        <button onClick={request} disabled={busy} className={`${base} bg-blue-500 text-white hover:bg-blue-600 shadow-[0_6px_0_#1d4ed8]`}><UserPlus />{busy ? 'Envoi…' : 'Demander en ami'}</button>
      )}
      {state.status === 'SENT' && (
        <div className="flex flex-wrap justify-center gap-2">
          <span className={`${base} bg-blue-500/15 text-blue-500 border border-blue-400/40`}>✓ Invitation envoyée</span>
          {state.friendshipId && <button onClick={cancel} disabled={busy} className={`${base} bg-gray-500/15 text-gray-500 border border-gray-400/30`}>Annuler</button>}
        </div>
      )}
      {state.status === 'RECEIVED' && (
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => respond('ACCEPT')} disabled={busy} className={`${base} bg-emerald-500 text-white shadow-[0_6px_0_#047857]`}>✓ Accepter son invitation</button>
          <button onClick={() => respond('REFUSE')} disabled={busy} className={`${base} bg-gray-500/15 text-gray-500 border border-gray-400/30`}>Refuser</button>
        </div>
      )}
      {state.status === 'FRIENDS' && (
        <Link href={`/etudiant/messages?avec=${encodeURIComponent(targetId)}`} className={`${base} bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_6px_0_#047857]`}><Chat />Envoyer un message</Link>
      )}
      {msg && <p className="text-xs font-semibold opacity-80">{msg}</p>}
    </div>
  );
}
