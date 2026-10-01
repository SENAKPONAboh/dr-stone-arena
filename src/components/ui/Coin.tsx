// Pièce UA dessinée en SVG : l'emoji 🪙 n'existe pas sur Windows 10 (il s'affichait comme un carré vide).
export default function Coin({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}
      style={{ display: 'inline-block', width: '1em', height: '1em', verticalAlign: '-0.14em', marginRight: '0.28em' }}>
      <circle cx="10" cy="10" r="9" fill="#f59e0b" stroke="#b45309" strokeWidth="1.2" />
      <circle cx="10" cy="10" r="6.4" fill="#fcd34d" stroke="#d97706" strokeWidth="0.9" />
      <path d="M10 5.6v8.8M7.6 8.2c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.6-1 1.4-2.4 1.8-2.4.8-2.4 1.8 1 1.6 2.4 1.6 2.4-.6 2.4-1.6" fill="none" stroke="#b45309" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
