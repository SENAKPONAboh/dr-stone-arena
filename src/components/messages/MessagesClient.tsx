'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Icon from '@/components/ui/Icon';

type UserCard = {
  id: string; prenom: string; nom: string; pseudo: string | null; imageUrl: string | null;
  anneeEtude: number | null; isPremium: boolean;
};
type LastMsg = { message: string; createdAt: string; mine: boolean; isRead: boolean };
type Friend = UserCard & { unread: number; last: LastMsg | null };
type Invit = { friendshipId: string; user: UserCard; createdAt: string };
// status : côté client seulement (envoi optimiste façon WhatsApp)
type Msg = { id: string; senderId: string; message: string; createdAt: string; isRead: boolean; status?: 'pending' | 'failed' };

const SEND_GAP_MS = 2100; // le serveur refuse plus d'1 message / 2 s : la file d'envoi respecte ce délai

// ===== Petites icônes du chat =====
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const Svg = ({ size = 20, children, className }: { size?: number; children: ReactNode; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>{children}</svg>
);
const BackIcon = () => <Svg size={24}><path d="M15 5l-7 7 7 7" {...stroke} /></Svg>;
const SendIcon = () => <Svg size={20}><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" fill="currentColor" /></Svg>;
const SearchIcon = ({ size = 18 }: { size?: number }) => <Svg size={size}><circle cx="11" cy="11" r="6.5" {...stroke} /><path d="m16 16 4.5 4.5" {...stroke} /></Svg>;
const PlusIcon = () => <Svg size={24}><path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.6} /></Svg>;
const MoreIcon = () => <Svg size={22}><g fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></g></Svg>;
const DownIcon = () => <Svg size={20}><path d="m6 9 6 6 6-6" {...stroke} /></Svg>;
const ClockIcon = () => <Svg size={13}><circle cx="12" cy="12" r="8.5" {...stroke} strokeWidth={2} /><path d="M12 7.5V12l3 2" {...stroke} strokeWidth={2} /></Svg>;
const Ticks = ({ read }: { read: boolean }) => (
  <svg width="17" height="11" viewBox="0 0 17 11" aria-label={read ? 'Lu' : 'Envoyé'} className={read ? 'text-sky' : 'text-mute'}>
    <path d="m1 6 3.2 3.2L10.5 2" {...stroke} strokeWidth={1.8} />
    {read && <path d="m6.6 9.2.4.4L15.5 2" {...stroke} strokeWidth={1.8} />}
  </svg>
);

// ===== Utilitaires =====
const nameOf = (u: { prenom: string; nom: string; pseudo: string | null }) => u.pseudo || `${u.prenom} ${u.nom}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function fmtListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (dayKey(d) === dayKey(now)) return fmtTime(iso);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return 'Hier';
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDayChip(d: Date) {
  const now = new Date();
  if (dayKey(d) === dayKey(now)) return "Aujourd'hui";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return 'Hier';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) });
}

const Avatar = ({ u, size = 44 }: { u: UserCard; size?: number }) => u.imageUrl ? (
  <img src={u.imageUrl} alt="" className="flex-shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
) : (
  <div className="flex flex-shrink-0 items-center justify-center rounded-full bg-mala/15 font-display font-bold text-mala"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}>
    {u.prenom.charAt(0)}{u.nom.charAt(0)}
  </div>
);

const Crown = ({ show }: { show: boolean }) => show
  ? <Icon name="crown" size={14} className="ml-1 inline-block flex-shrink-0 align-[-2px] text-gold" />
  : null;

// Fond discret de la discussion (croix médicales + petits tracés ECG), suit la couleur du thème
const ChatWallpaper = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full text-ink opacity-[0.035]" aria-hidden="true">
    <defs>
      <pattern id="chat-wall" width="120" height="120" patternUnits="userSpaceOnUse">
        <path d="M18 10h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="currentColor" />
        <path d="M60 40h12l4-10 7 22 5-12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="30" cy="88" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="30" cy="88" r="2.5" fill="currentColor" />
        <path d="M90 82h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#chat-wall)" />
  </svg>
);

export default function MessagesClient({ me }: { me: { id: string } }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  // ----- Liste -----
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Invit[]>([]);
  const [outgoing, setOutgoing] = useState<Invit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState('');

  // ----- Discussion -----
  const [selected, setSelected] = useState<UserCard | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedRef = useRef<UserCard | null>(null);
  const pendingRef = useRef<Msg[]>([]);           // messages pas encore confirmés par le serveur
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSentAtRef = useRef(0);
  const atBottomRef = useRef(true);
  const seenIdsRef = useRef<Set<string>>(new Set()); // pour n'animer que les nouveaux messages
  const hadUnreadRef = useRef(false);
  const pushedHistoryRef = useRef(false);

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2800); };

  // ===== Chargements =====
  const loadFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } catch { /* silencieux */ } finally { setLoaded(true); }
  }, []);

  const loadMessages = useCallback(async (withUserId: string) => {
    try {
      const res = await fetch(`/api/messages?withUserId=${encodeURIComponent(withUserId)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (selectedRef.current?.id !== withUserId) return; // l'utilisateur a changé de discussion entre-temps
      const server: Msg[] = data.messages ?? [];
      setMessages(prev => {
        const added = server.filter(m => !prev.some(p => p.id === m.id) && m.senderId !== me.id).length;
        if (added > 0 && !atBottomRef.current) setNewBelow(n => n + added);
        return [...server, ...pendingRef.current];
      });
      if (data.friend) setSelected(s => (s && s.id === data.friend.id ? { ...s, ...data.friend } : s));
    } catch { /* silencieux */ } finally { setConvLoading(false); }
  }, [me.id]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Rafraîchissement : liste toutes les 10 s, discussion toutes les 4 s (en pause si l'appli est en arrière-plan)
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      if (selectedRef.current) loadMessages(selectedRef.current.id);
      else loadFriends();
    };
    const t = setInterval(tick, selected ? 4000 : 10000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [selected, loadFriends, loadMessages]);

  // ===== Défilement =====
  const scrollToBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (bottom) setNewBelow(0);
  };

  // Nouveau message : on descend seulement si l'utilisateur était déjà en bas (comme WhatsApp)
  useLayoutEffect(() => {
    if (!selected) return;
    if (atBottomRef.current) scrollToBottom(seenIdsRef.current.size > 0);
    messages.forEach(m => seenIdsRef.current.add(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ===== Ouvrir / fermer une discussion =====
  const openConversation = (u: Friend | UserCard) => {
    hadUnreadRef.current = 'unread' in u && u.unread > 0;
    selectedRef.current = u;
    pendingRef.current = [];
    seenIdsRef.current = new Set();
    atBottomRef.current = true;
    setAtBottom(true);
    setNewBelow(0);
    setMenuOpen(false);
    setMessages([]);
    setConvLoading(true);
    setSelected(u);
    // Le bouton « retour » du téléphone ferme la discussion au lieu de quitter la page
    try { window.history.pushState({ arenaChat: u.id }, ''); pushedHistoryRef.current = true; } catch { /* ignore */ }
    loadMessages(u.id);
  };

  const closeConversation = useCallback(() => {
    selectedRef.current = null;
    setSelected(null);
    setMenuOpen(false);
    setNewMessage('');
    loadFriends();
    // Met à jour la pastille « messages non lus » de l'en-tête
    if (hadUnreadRef.current) { hadUnreadRef.current = false; router.refresh(); }
  }, [loadFriends, router]);

  const goBack = () => {
    if (pushedHistoryRef.current) { pushedHistoryRef.current = false; window.history.back(); }
    else closeConversation();
  };

  useEffect(() => {
    const onPop = () => {
      if (selectedRef.current) { pushedHistoryRef.current = false; closeConversation(); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [closeConversation]);

  // Bloque le défilement de la page derrière la discussion plein écran
  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [selected]);

  // ===== Envoi (optimiste + file d'attente) =====
  const deliver = async (tmp: Msg, toUserId: string) => {
    const wait = lastSentAtRef.current + SEND_GAP_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const attempt = async () => fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, message: tmp.message }),
    });
    try {
      let res = await attempt();
      if (res.status === 400) {
        const d = await res.clone().json().catch(() => null);
        if (String(d?.error ?? '').startsWith('Doucement')) {
          await new Promise(r => setTimeout(r, SEND_GAP_MS));
          res = await attempt();
        }
      }
      const data = await res.json().catch(() => null);
      lastSentAtRef.current = Date.now();
      if (!res.ok || !data?.message) throw new Error(data?.error || 'Erreur');
      pendingRef.current = pendingRef.current.filter(p => p.id !== tmp.id);
      if (selectedRef.current?.id !== toUserId) return;
      setMessages(prev => {
        const without = prev.filter(p => p.id !== tmp.id);
        return without.some(p => p.id === data.message.id) ? without : [...without.filter(p => !p.status), data.message, ...without.filter(p => p.status)];
      });
      seenIdsRef.current.add(data.message.id);
    } catch (e: any) {
      pendingRef.current = pendingRef.current.map(p => p.id === tmp.id ? { ...p, status: 'failed' } : p);
      if (selectedRef.current?.id === toUserId) {
        setMessages(prev => prev.map(p => p.id === tmp.id ? { ...p, status: 'failed' } : p));
        if (e?.message && e.message !== 'Erreur') showToast(e.message);
      }
    }
  };

  const enqueue = (tmp: Msg, toUserId: string) => {
    queueRef.current = queueRef.current.then(() => deliver(tmp, toUserId));
  };

  const send = () => {
    const msg = newMessage.trim();
    if (!msg || !selected) return;
    const tmp: Msg = { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, senderId: me.id, message: msg, createdAt: new Date().toISOString(), isRead: false, status: 'pending' };
    pendingRef.current = [...pendingRef.current, tmp];
    atBottomRef.current = true;
    setMessages(prev => [...prev, tmp]);
    setNewMessage('');
    inputRef.current?.focus();
    enqueue(tmp, selected.id);
  };

  const retry = (m: Msg) => {
    if (!selected) return;
    pendingRef.current = pendingRef.current.map(p => p.id === m.id ? { ...p, status: 'pending' } : p);
    setMessages(prev => prev.map(p => p.id === m.id ? { ...p, status: 'pending' } : p));
    enqueue({ ...m, status: 'pending' }, selected.id);
  };

  // Zone de saisie qui grandit avec le texte (jusqu'à 5 lignes)
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [newMessage, selected]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Sur PC : Entrée envoie, Maj+Entrée va à la ligne. Sur téléphone : Entrée va à la ligne (comme WhatsApp).
    const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !touch) { e.preventDefault(); send(); }
  };

  // ===== Amis =====
  const post = async (body: object) => {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const search = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearched(false); return; }
    setSearching(true);
    try {
      const { ok, data } = await post({ action: 'SEARCH', q });
      if (ok) setSearchResults(data.results ?? []);
      setSearched(true);
    } finally { setSearching(false); }
  };

  const invite = async (userId: string) => {
    const { ok, data } = await post({ action: 'REQUEST', userId });
    if (!ok) { showToast(data?.error || 'Erreur'); return; }
    showToast('Invitation envoyée !');
    setSearchResults(prev => prev.filter(u => u.id !== userId));
    loadFriends();
  };

  const respond = async (friendshipId: string, action: 'ACCEPT' | 'REFUSE' | 'CANCEL') => {
    const { ok, data } = await post({ action, friendshipId });
    if (!ok) { showToast(data?.error || 'Erreur'); return; }
    if (action === 'ACCEPT') showToast('Vous êtes maintenant amis !');
    loadFriends();
  };

  const removeFriend = async (userId: string) => {
    setMenuOpen(false);
    if (!confirm('Retirer cet ami ? Vous ne pourrez plus discuter ensemble (il pourra être réinvité plus tard).')) return;
    const { ok, data } = await post({ action: 'REMOVE', userId });
    if (!ok) { showToast(data?.error || 'Erreur'); return; }
    goBack();
  };

  // ===== Données dérivées =====
  const sortedFriends = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return friends
      .filter(f => !q || nameOf(f).toLowerCase().includes(q) || `${f.prenom} ${f.nom}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const ta = a.last ? new Date(a.last.createdAt).getTime() : 0;
        const tb = b.last ? new Date(b.last.createdAt).getTime() : 0;
        if (ta !== tb) return tb - ta;
        return nameOf(a).localeCompare(nameOf(b), 'fr');
      });
  }, [friends, filter]);

  // Regroupe les messages : séparateur de jour + bulles consécutives du même auteur
  const rows = useMemo(() => {
    const out: ({ kind: 'day'; key: string; label: string } | { kind: 'msg'; key: string; m: Msg; mine: boolean; first: boolean; last: boolean })[] = [];
    messages.forEach((m, i) => {
      const d = new Date(m.createdAt);
      const prev = messages[i - 1];
      const next = messages[i + 1];
      if (!prev || dayKey(new Date(prev.createdAt)) !== dayKey(d)) out.push({ kind: 'day', key: `day-${dayKey(d)}`, label: fmtDayChip(d) });
      const sameAsPrev = !!prev && prev.senderId === m.senderId && dayKey(new Date(prev.createdAt)) === dayKey(d) && d.getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
      const sameAsNext = !!next && next.senderId === m.senderId && dayKey(new Date(next.createdAt)) === dayKey(d) && new Date(next.createdAt).getTime() - d.getTime() < 5 * 60000;
      out.push({ kind: 'msg', key: m.id, m, mine: m.senderId === me.id, first: !sameAsPrev, last: !sameAsNext });
    });
    return out;
  }, [messages, me.id]);

  const totalUnread = friends.reduce((s, f) => s + f.unread, 0);

  // =====================================================================
  return (
    <div className="relative pb-24 font-body">

      {/* Petit message flottant */}
      <AnimatePresence>
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            className="fixed left-1/2 top-16 z-[95] -translate-x-1/2 rounded-full border border-line bg-slab-2 px-4 py-2 text-sm font-bold text-ink shadow-lg">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= LISTE DES DISCUSSIONS ================= */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Discussions</h1>
          <p className="text-xs text-mute">
            {totalUnread > 0 ? `${totalUnread} message${totalUnread > 1 ? 's' : ''} non lu${totalUnread > 1 ? 's' : ''}` : 'Discute en privé avec tes amis'}
          </p>
        </div>
      </div>

      {/* Recherche dans les discussions */}
      {friends.length > 3 && (
        <label className="mb-3 flex items-center gap-2 rounded-full border border-line bg-slab px-4 py-2.5 text-mute focus-within:border-mala/60">
          <SearchIcon />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher une discussion"
            className="w-full bg-transparent text-sm text-ink placeholder:text-mute outline-none" />
        </label>
      )}

      {/* Invitations reçues */}
      <AnimatePresence initial={false}>
        {incoming.length > 0 && (
          <motion.section key="incoming" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden rounded-2xl border border-mala/30 bg-mala/[0.06]">
            <h2 className="px-4 pt-3 font-display text-[11px] font-bold uppercase tracking-wider text-mala">
              Invitations reçues · {incoming.length}
            </h2>
            <div className="divide-y divide-line/60">
              {incoming.map(inv => (
                <div key={inv.friendshipId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar u={inv.user} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center truncate font-bold text-ink">{nameOf(inv.user)}<Crown show={inv.user.isPremium} /></p>
                    <p className="text-xs text-mute">Veut devenir ton ami</p>
                  </div>
                  <button onClick={() => respond(inv.friendshipId, 'REFUSE')}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slab-2 text-mute active:scale-90" aria-label="Refuser">
                    <Icon name="close" size={14} />
                  </button>
                  <button onClick={() => respond(inv.friendshipId, 'ACCEPT')}
                    className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-mala px-3.5 text-xs font-extrabold text-stone active:scale-95">
                    <Icon name="check" size={14} /> Accepter
                  </button>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Discussions */}
      <section className="overflow-hidden rounded-2xl border border-line bg-slab">
        {!loaded ? (
          <div className="divide-y divide-line/60">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-12 w-12 animate-pulse rounded-full bg-slab-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slab-2" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slab-2" />
                </div>
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-mala/15 text-mala"><Icon name="chat" size={26} /></div>
            <p className="font-bold text-ink">Pas encore de discussion</p>
            <p className="mt-1 text-sm text-mute">Ajoute des camarades avec le bouton <span className="font-bold text-mala">+</span> pour discuter avec eux.</p>
          </div>
        ) : sortedFriends.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-mute">Aucune discussion ne correspond à « {filter} ».</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {sortedFriends.map((f, i) => (
              <motion.li key={f.id} layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <button onClick={() => openConversation(f)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slab-2/60 active:bg-slab-2">
                  <Avatar u={f} size={50} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="flex min-w-0 items-center truncate font-bold text-ink">
                        <span className="truncate">{nameOf(f)}</span><Crown show={f.isPremium} />
                      </p>
                      {f.last && (
                        <span className={`flex-shrink-0 text-[11px] tabular-nums ${f.unread > 0 ? 'font-bold text-mala' : 'text-mute'}`}>
                          {fmtListTime(f.last.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={`flex min-w-0 flex-1 items-center gap-1 truncate text-sm ${f.unread > 0 ? 'font-semibold text-ink' : 'text-mute'}`}>
                        {f.last ? (
                          <>
                            {f.last.mine && <span className="flex-shrink-0"><Ticks read={f.last.isRead} /></span>}
                            <span className="truncate">{f.last.message}</span>
                          </>
                        ) : (
                          <span className="truncate italic">{f.anneeEtude ? `EM${f.anneeEtude} · ` : ''}Dis bonjour 👋</span>
                        )}
                      </p>
                      {f.unread > 0 && (
                        <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }}
                          className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-mala px-1.5 font-display text-[10px] font-bold text-stone">
                          {f.unread > 99 ? '99+' : f.unread}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      {/* Invitations envoyées */}
      {outgoing.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 px-1 font-display text-[11px] font-bold uppercase tracking-wider text-mute">En attente de réponse · {outgoing.length}</h2>
          <div className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line bg-slab">
            {outgoing.map(inv => (
              <div key={inv.friendshipId} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar u={inv.user} size={36} />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{nameOf(inv.user)}</p>
                <button onClick={() => respond(inv.friendshipId, 'CANCEL')}
                  className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-mute hover:bg-slab-2 hover:text-heart">Annuler</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bouton flottant « nouveau contact » */}
      <motion.button onClick={() => setAddOpen(true)} aria-label="Ajouter un ami"
        initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
        whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.15 }}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-mala text-stone md:bottom-8 md:right-8"
        style={{ boxShadow: '0 4px 0 var(--mala-deep, #0f7a4f), 0 10px 24px rgba(0,0,0,.35)' }}>
        <PlusIcon />
      </motion.button>

      {/* ================= FEUILLE « AJOUTER UN AMI » ================= */}
      <AnimatePresence>
        {addOpen && (
          <motion.div key="add" className="fixed inset-0 z-[85] flex items-end justify-center md:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/55" onClick={() => setAddOpen(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
              className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-line bg-slab pb-[env(safe-area-inset-bottom)] md:rounded-3xl md:border">
              <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <h2 className="font-display text-base font-bold text-ink">Ajouter un ami</h2>
                <button onClick={() => setAddOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-mute hover:bg-slab-2" aria-label="Fermer">
                  <Icon name="close" size={14} />
                </button>
              </div>
              <form onSubmit={e => { e.preventDefault(); search(); }} className="flex gap-2 px-5 pb-3">
                <label className="flex flex-1 items-center gap-2 rounded-full border border-line bg-stone px-4 py-2.5 text-mute focus-within:border-mala/60">
                  <SearchIcon />
                  <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Pseudo, prénom ou nom…"
                    className="w-full bg-transparent text-sm text-ink placeholder:text-mute outline-none" />
                </label>
                <button type="submit" disabled={searching || searchQuery.trim().length < 2}
                  className="flex-shrink-0 rounded-full bg-mala px-4 text-sm font-extrabold text-stone disabled:opacity-40">
                  {searching ? '…' : 'Chercher'}
                </button>
              </form>
              <div className="min-h-[120px] flex-1 overflow-y-auto px-2 pb-4">
                {searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((u, i) => (
                      <motion.li key={u.id} initial={reduce ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                        <Avatar u={u} size={42} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center truncate text-sm font-bold text-ink"><span className="truncate">{nameOf(u)}</span><Crown show={u.isPremium} /></p>
                          <p className="text-xs text-mute">{u.anneeEtude ? (u.anneeEtude >= 7 ? 'Médecin' : `EM${u.anneeEtude}`) : '—'}</p>
                        </div>
                        <button onClick={() => invite(u.id)}
                          className="flex-shrink-0 rounded-full bg-mala/15 px-4 py-2 text-xs font-extrabold text-mala active:scale-95">Inviter</button>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-mute">
                    {searched ? 'Aucun étudiant trouvé. Essaie un autre nom.' : 'Tape au moins 2 lettres puis « Chercher ».'}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= DISCUSSION PLEIN ÉCRAN ================= */}
      <AnimatePresence>
        {selected && (
          <motion.div key="conv"
            initial={reduce ? { opacity: 0 } : { x: '100%' }} animate={reduce ? { opacity: 1 } : { x: 0 }} exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
            className="fixed inset-0 z-[80] flex flex-col bg-stone md:left-56">

            {/* En-tête */}
            <header className="relative z-10 flex items-center gap-2 border-b border-line bg-slab px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <button onClick={goBack} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-ink hover:bg-slab-2" aria-label="Retour">
                <BackIcon />
              </button>
              <Avatar u={selected} size={40} />
              <div className="min-w-0 flex-1 pl-1">
                <p className="flex items-center truncate font-bold leading-tight text-ink">
                  <span className="truncate">{nameOf(selected)}</span><Crown show={selected.isPremium} />
                </p>
                <p className="truncate text-[11px] text-mute">
                  {selected.anneeEtude ? (selected.anneeEtude >= 7 ? 'Médecin' : `Étudiant en EM${selected.anneeEtude}`) : 'Ami Arena'}
                </p>
              </div>
              <div className="relative">
                <button onClick={() => setMenuOpen(o => !o)} className="flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-slab-2" aria-label="Options">
                  <MoreIcon />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <motion.div initial={{ opacity: 0, scale: 0.9, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        style={{ transformOrigin: 'top right' }}
                        className="absolute right-1 top-11 z-20 w-52 overflow-hidden rounded-xl border border-line bg-slab-2 py-1 shadow-xl">
                        <button onClick={() => removeFriend(selected.id)}
                          className="block w-full px-4 py-3 text-left text-sm font-semibold text-heart hover:bg-slab">
                          Retirer cet ami
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* Messages */}
            <div className="relative min-h-0 flex-1">
              <ChatWallpaper />
              <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto overscroll-contain px-3 py-3">
                <div className="mx-auto flex max-w-3xl flex-col">
                  {convLoading && messages.length === 0 && (
                    <div className="flex justify-center py-10">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-mala border-t-transparent" />
                    </div>
                  )}
                  {!convLoading && messages.length === 0 && (
                    <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mt-10 max-w-xs rounded-2xl border border-line bg-slab/90 px-5 py-4 text-center">
                      <p className="text-2xl">👋</p>
                      <p className="mt-1 text-sm font-bold text-ink">Dis bonjour à {selected.prenom} !</p>
                      <p className="mt-1 text-xs text-mute">Vos messages restent entre vous deux.</p>
                    </motion.div>
                  )}

                  {rows.map(r => {
                    if (r.kind === 'day') {
                      return (
                        <div key={r.key} className="sticky top-0 z-[1] my-2 flex justify-center">
                          <span className="rounded-lg border border-line/70 bg-slab/95 px-3 py-1 text-[11px] font-semibold text-mute shadow-sm first-letter:uppercase">
                            {r.label}
                          </span>
                        </div>
                      );
                    }
                    const { m, mine, first, last } = r;
                    const isNew = seenIdsRef.current.size > 0 && !seenIdsRef.current.has(m.id);
                    return (
                      <motion.div key={r.key}
                        initial={isNew && !reduce ? { opacity: 0, scale: 0.85, y: 10 } : false}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
                        style={{ transformOrigin: mine ? 'bottom right' : 'bottom left' }}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'} ${first ? 'mt-2' : 'mt-0.5'}`}>
                        <div
                          onClick={m.status === 'failed' ? () => retry(m) : undefined}
                          className={`relative max-w-[82%] px-2.5 pb-1.5 pt-1.5 shadow-sm sm:max-w-[70%] ${mine
                            ? `bg-mala/20 text-ink ${first ? 'rounded-2xl rounded-tr-[5px]' : 'rounded-2xl'}`
                            : `border border-line/60 bg-slab text-ink ${first ? 'rounded-2xl rounded-tl-[5px]' : 'rounded-2xl'}`}
                            ${m.status === 'failed' ? 'cursor-pointer ring-1 ring-heart/60' : ''}`}>
                          {/* Petite pointe de la bulle (1er message d'un groupe) */}
                          {first && (
                            <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"
                              className={`absolute top-0 ${mine ? '-right-[7px] text-mala/20' : '-left-[7px] scale-x-[-1] text-slab'}`}>
                              <path d="M0 0h8L0 12z" fill="currentColor" />
                            </svg>
                          )}
                          <p className="whitespace-pre-wrap break-words px-1 text-[15px] leading-snug">
                            {m.message}
                            {/* espace réservé pour l'heure, comme WhatsApp */}
                            <span className="inline-block w-[62px]" aria-hidden="true" />
                          </p>
                          <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] tabular-nums text-mute">
                            {fmtTime(m.createdAt)}
                            {mine && (m.status === 'pending' ? <ClockIcon /> : m.status === 'failed'
                              ? <span className="font-bold text-heart">!</span>
                              : <Ticks read={m.isRead} />)}
                          </span>
                          {m.status === 'failed' && last && (
                            <span className="mt-0.5 block px-1 text-[11px] font-semibold text-heart">Non envoyé · touche pour réessayer</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div className="h-1" />
                </div>
              </div>

              {/* Bouton « descendre » */}
              <AnimatePresence>
                {!atBottom && (
                  <motion.button key="down" onClick={() => scrollToBottom(true)}
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                    className="absolute bottom-3 right-3 z-[2] flex h-11 w-11 items-center justify-center rounded-full border border-line bg-slab text-ink shadow-lg"
                    aria-label="Aller aux derniers messages">
                    <DownIcon />
                    {newBelow > 0 && (
                      <span className="absolute -top-1.5 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-mala px-1 font-display text-[10px] font-bold text-stone">
                        {newBelow}
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Saisie */}
            <div className="relative z-10 bg-stone px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
              <div className="mx-auto flex max-w-3xl items-end gap-2">
                <div className="flex min-h-[48px] flex-1 items-end rounded-3xl border border-line bg-slab px-4 py-[11px] focus-within:border-mala/50">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value.slice(0, 500))}
                    onKeyDown={onKeyDown}
                    placeholder="Message"
                    maxLength={500}
                    className="block max-h-[120px] w-full resize-none bg-transparent text-[15px] leading-snug text-ink placeholder:text-mute outline-none"
                  />
                  {newMessage.length > 400 && (
                    <span className={`ml-2 flex-shrink-0 self-end text-[10px] tabular-nums ${newMessage.length >= 500 ? 'text-heart' : 'text-mute'}`}>
                      {500 - newMessage.length}
                    </span>
                  )}
                </div>
                <motion.button
                  onClick={send}
                  disabled={!newMessage.trim()}
                  whileTap={{ scale: 0.88 }}
                  animate={{ scale: newMessage.trim() ? 1 : 0.92, opacity: newMessage.trim() ? 1 : 0.55 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-mala text-stone"
                  aria-label="Envoyer">
                  <SendIcon />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
