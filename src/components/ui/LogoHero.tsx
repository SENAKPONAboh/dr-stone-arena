// Logo animé en grand : l'anneau se trace autour du monogramme, une étincelle fait le tour,
// le « DS » apparaît, un reflet le traverse, puis le nom se déploie.
export default function LogoHero({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="logo-hero">
        <span className="lh-halo" />
        <svg className="lh-ring" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id="lh-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5aa8ff" />
              <stop offset="100%" stopColor="#1f5fe0" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" pathLength={1} />
        </svg>
        <span className="lh-spark" />
        <div className="lh-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/mark.png" alt="Dr. Stone Arena" draggable={false} />
        </div>
        <span className="lh-sheen" />
      </div>
      {withWordmark && (
        <div className="logo-word">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/wordmark.png" alt="Doctor Stone Arena — Révise, progresse, affronte" draggable={false} />
        </div>
      )}
    </div>
  );
}
