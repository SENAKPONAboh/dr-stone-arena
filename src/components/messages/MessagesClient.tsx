'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type UserCard = {
  id: string; prenom: string; nom: string; pseudo: string | null; imageUrl: string | null;
  anneeEtude: number | null; isPremium: boolean;
};
type Friend = UserCard & { unread: number };
type Invit = { friendshipId: string; user: UserCard; createdAt: string };
type Msg = { id: string; senderId: string; message: string; createdAt: string; isRead: boolean };

const Avatar = ({ u, size = 40 }: { u: UserCard; size?: number }) => u.imageUrl ? (
  <img src={u.imageUrl} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
) : (
  <div className="rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}>
    {u.prenom.charAt(0)}{u.nom.charAt(0)}
  </div>
);

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function MessagesClient({ me }: { me: { id: string } }) {
  const [view, setView] = useState<'list' | 'conversation'>('list');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Invit[]>([]);
  const [outgoing, setOutgoing] = useState<Invit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserCard | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;

  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends');
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch { /* silencieux */ }
  }, []);

  const loadMessages = useCallback(async (withUserId: string) => {
    try {
      const res = await fetch(`/api/messages?withUserId=${withUserId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      if (data.friend) setSelected(data.friend);
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Polling : liste toutes les 10 s / conversation toutes les 4 s
  useEffect(() => {
    if (view === 'list') {
      const t = setInterval(loadFriends, 10000);
      return () => clearInterval(t);
    }
    if (view === 'conversation' && selected) {
      const t = setInterval(() => loadMessages(selected.id), 4000);
      return () => clearInterval(t);
    }
  }, [view, selected, loadFriends, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const post = async (body: object) => {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  const search = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { ok, data } = await post({ action: 'SEARCH', q });
      if (ok) setSearchResults(data.results ?? []);
    } finally { setSearching(false); }
  };

  const invite = async (userId: string) => {
    const { ok, data } = await post({ action: 'REQUEST', userId });
    if (!ok) { setError(data?.error || 'Erreur'); return; }
    setFlash('📨 Invitation envoyée !');
    setTimeout(() => setFlash(''), 3000);
    setSearchResults(prev => prev.filter(u => u.id !== userId));
    loadFriends();
  };

  const respond = async (friendshipId: string, action: 'ACCEPT' | 'REFUSE' | 'CANCEL') => {
    const { ok, data } = await post({ action, friendshipId });
    if (!ok) { setError(data?.error || 'Erreur'); return; }
    loadFriends();
  };

  const removeFriend = async (userId: string) => {
    if (!confirm('Retirer cet ami ? Vous ne pourrez plus discuter ensemble (il pourra être réinvité plus tard).')) return;
    const { ok } = await post({ action: 'REMOVE', userId });
    if (ok) { setView('list'); setSelected(null); loadFriends(); }
  };

  const openConversation = async (u: UserCard) => {
    setSelected(u);
    setView('conversation');
    setMessages([]);
    setError('');
    await loadMessages(u.id);
  };

  const send = async () => {
    const msg = newMessage.trim();
    if (!msg || !selected || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: selected.id, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || 'Erreur'); return; }
      setNewMessage('');
      setMessages(prev => [...prev, data.message]);
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">

      {error && (
        <div className="bg-red-100 border-2 border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{error}</div>
      )}
      {flash && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-green-100 border-2 border-green-200 text-green-600 px-4 py-3 rounded-2xl text-sm font-bold text-center">{flash}</motion.div>
      )}

      {/* ================= VUE LISTE ================= */}
      {view === 'list' && (
        <div className="space-y-6">

          <div className="flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <div>
              <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">Messages</h1>
              <p className="text-xs text-gray-400">Discute en privé avec tes amis</p>
            </div>
          </div>

          {/* Invitations reçues */}
          {incoming.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
              <h2 className="font-extrabold text-sm text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-3">📨 Invitations reçues ({incoming.length})</h2>
              <div className="space-y-3">
                {incoming.map(inv => (
                  <div key={inv.friendshipId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-2xl">
                    <Avatar u={inv.user} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-white truncate">{nameOf(inv.user)} {inv.user.isPremium && '👑'}</p>
                      <p className="text-xs text-gray-400">Souhaite devenir ton ami</p>
                    </div>
                    <button onClick={() => respond(inv.friendshipId, 'ACCEPT')}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-extrabold flex-shrink-0">✅ Accepter</button>
                    <button onClick={() => respond(inv.friendshipId, 'REFUSE')}
                      className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-bold flex-shrink-0">Refuser</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amis */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
            <h2 className="font-extrabold text-sm text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-3">
              🤝 Mes amis ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun ami pour l'instant — cherche des étudiants ci-dessous et envoie-leur une invitation !</p>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <motion.button key={f.id} onClick={() => openConversation(f)}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-2xl text-left">
                    <Avatar u={f} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-white truncate">{nameOf(f)} {f.isPremium && '👑'}</p>
                      <p className="text-xs text-gray-400">{f.anneeEtude ? `EM${f.anneeEtude}` : '—'}</p>
                    </div>
                    {f.unread > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-extrabold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0">
                        {f.unread > 9 ? '9+' : f.unread}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Invitations envoyées */}
          {outgoing.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
              <h2 className="font-extrabold text-sm text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-3">⏳ Invitations envoyées ({outgoing.length})</h2>
              <div className="space-y-2">
                {outgoing.map(inv => (
                  <div key={inv.friendshipId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-2xl">
                    <Avatar u={inv.user} size={36} />
                    <p className="flex-1 font-bold text-gray-800 dark:text-white truncate text-sm">{nameOf(inv.user)}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">En attente…</span>
                    <button onClick={() => respond(inv.friendshipId, 'CANCEL')}
                      className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-bold flex-shrink-0">Annuler</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ajouter un ami */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
            <h2 className="font-extrabold text-sm text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-3">🔍 Ajouter un ami</h2>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Pseudo, prénom ou nom…"
                className="flex-1 bg-gray-50 dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-800 dark:text-white font-bold focus:border-blue-400 outline-none"
              />
              <button onClick={search} disabled={searching}
                className="px-5 py-3 rounded-2xl bg-blue-500 text-white font-extrabold text-sm disabled:opacity-50">
                {searching ? '⏳' : '🔍'}
              </button>
            </div>
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 mt-4">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-2xl">
                      <Avatar u={u} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 dark:text-white truncate text-sm">{nameOf(u)} {u.isPremium && '👑'}</p>
                        <p className="text-xs text-gray-400">{u.anneeEtude ? `EM${u.anneeEtude}` : '—'}</p>
                      </div>
                      <button onClick={() => invite(u.id)}
                        className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-extrabold flex-shrink-0">📨 Inviter</button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ================= VUE CONVERSATION ================= */}
      {view === 'conversation' && selected && (
        <div className="flex flex-col h-[calc(100vh-190px)]">

          {/* En-tête conversation */}
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-3">
            <button onClick={() => { setView('list'); setSelected(null); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <Avatar u={selected} size={40} />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-800 dark:text-white truncate">{nameOf(selected)} {selected.isPremium && '👑'}</p>
              <p className="text-[10px] text-gray-400">{selected.anneeEtude ? `EM${selected.anneeEtude}` : ''}</p>
            </div>
            <button onClick={() => removeFriend(selected.id)}
              className="text-xs text-gray-300 hover:text-red-400 font-bold flex-shrink-0 px-2" title="Retirer cet ami">🗑️</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-300 dark:text-gray-500 text-center py-8">Envoyez votre premier message à {selected.prenom} ! 👋</p>
            )}
            {messages.map(m => {
              const mine = m.senderId === me.id;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && <Avatar u={selected} size={28} />}
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${mine
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-bl-md'}`}>
                    <p className="text-sm leading-relaxed break-words">{m.message}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>{fmtTime(m.createdAt)}</p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Saisie */}
          <div className="flex gap-2 mt-3">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ton message…"
              maxLength={500}
              className="flex-1 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-800 dark:text-white focus:border-blue-400 outline-none"
            />
            <motion.button onClick={send} disabled={sending || !newMessage.trim()}
              whileTap={{ scale: 0.92 }}
              className="px-5 py-3 rounded-2xl bg-blue-500 text-white text-lg disabled:opacity-40 flex-shrink-0">
              {sending ? '⏳' : '➤'}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}