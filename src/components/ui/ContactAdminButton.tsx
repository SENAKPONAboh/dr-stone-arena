// Bouton « Contacter l'administration » des pages de connexion et d'inscription :
// ouvre une discussion WhatsApp avec l'admin (+227 90 01 62 84), message pré-rempli.
const ADMIN_WHATSAPP = '22790016284';

export default function ContactAdminButton({ context }: { context: 'connexion' | 'inscription' }) {
  const text = `Bonjour, j'ai un problème avec ${context === 'connexion' ? 'la connexion' : "l'inscription"} sur Dr. Stone Arena.`;
  const href = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;

  return (
    <div className="mt-6 border-t border-line pt-5 text-center">
      <p className="mb-3 text-xs text-mute">Un problème ? L&apos;administration te répond sur WhatsApp.</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-mala/40 bg-mala/10 px-4 py-3 text-sm font-extrabold text-mala transition-transform active:translate-y-0.5 hover:bg-mala/15"
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        Contacter l&apos;administration
      </a>
    </div>
  );
}
