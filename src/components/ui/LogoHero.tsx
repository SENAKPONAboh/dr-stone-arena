// Logo animé en grand : le monogramme apparaît en grossissant, un halo bleu et or respire,
// un reflet le traverse, des étincelles montent, puis le nom se déploie.
export default function LogoHero({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="logo-hero">
        <span className="lh-halo" />
        <div className="lh-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/mark.png" alt="Dr. Stone Arena" draggable={false} />
        </div>
        <span className="lh-sheen" />
        <i className="lh-dot" /><i className="lh-dot" /><i className="lh-dot" /><i className="lh-dot" />
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
