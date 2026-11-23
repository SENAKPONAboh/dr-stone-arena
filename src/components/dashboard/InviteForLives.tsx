'use client';

// Bloc « Invite un ami = +3 vies » : affiché quand l'étudiant perd une vie ou n'en a plus.
// Partage du lien personnel par WhatsApp (ou le menu de partage du téléphone) ou copie du lien.
import { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/Icon';

type Props = {
  code: string | null;
  joined?: number;
  rewarded?: number;
  livesLeft?: number;
  compact?: boolean;
};

export default function InviteForLives({ code, joined = 0, rewarded = 0, livesLeft, compact = false }: Props) {
  const [copied, setCopied] = useState(false);
  if (!code) return null; // tables pas encore créées : rien à afficher

  const link = () => `${window.location.origin}/register?invite=${code}`;
  const message = () =>
    `Je révise la médecine sur Dr Stone Arena : des cas cliniques chaque jour, des duels et un classement entre étudiants. Inscris-toi avec mon lien, c'est gratuit 👉 ${link()}`;

  const share = async () => {
    const text = message();
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch { return; /* partage annulé */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`rounded-2xl border border-mala/40 bg-mala/10 text-left ${compact ? 'mb-3 p-3' : 'mt-4 p-4'}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-heart/15 text-heart">
          <motion.span animate={{ scale: [1, 1.18, 1, 1.12, 1] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }} className="motion-reduce:!transform-none">
            <Icon name="heart" size={24} />
          </motion.span>
          <span className="absolute -right-1 -top-1 rounded-full bg-mala px-1.5 text-[10px] font-extrabold text-stone">+3</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-ink">Invite un ami : +3 vies</p>
          <p className="text-xs leading-snug text-mute">
            {typeof livesLeft === 'number' && livesLeft <= 3 ? `Plus que ${livesLeft} vie${livesLeft > 1 ? 's' : ''}. ` : ''}
            Chaque ami qui s&apos;inscrit avec ton lien et joue son 1er cas te donne 3 vies.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={share}
          className="flex-1 rounded-xl bg-mala px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-stone shadow-[0_4px_0_#0f7a4f] transition-[transform,box-shadow] duration-75 active:translate-y-1 active:shadow-[0_1px_0_#0f7a4f]">
          Inviter sur WhatsApp
        </button>
        <button onClick={copy}
          className="rounded-xl border border-line bg-slab-2 px-3 py-2.5 text-xs font-bold text-ink transition-transform active:scale-95">
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
      </div>

      {joined > 0 && (
        <p className="mt-2 text-[11px] text-mute">
          {joined} ami{joined > 1 ? 's' : ''} inscrit{joined > 1 ? 's' : ''} · {rewarded * 3} vies gagnées
          {joined > rewarded ? ` · ${joined - rewarded} en attente de leur 1er cas` : ''}
        </p>
      )}
    </motion.div>
  );
}
