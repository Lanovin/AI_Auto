/**
 * Cargent shared footer — minimal version for tool pages, dashboard, profile,
 * auth flows. The landing has its own richer footer with link columns.
 *
 * Preserved API: optional `brandName` prop is accepted for backwards-compat
 * with existing call sites; the wordmark is always rendered as Cargent.
 */

type FooterProps = {
  brandName?: string;
};

const footerItems = ['Retail ocenění', 'B2B workflow', 'API'];

export default function Footer({ brandName: _brandName }: FooterProps) {
  return (
    <footer
      className="border-t border-[color:var(--color-line)] bg-paper-2 py-6"
      id="zdroje"
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-[22px] text-[11px] text-faint md:flex-row md:items-center md:justify-between md:px-8">
        <span className="flex items-center gap-2">
          <FooterLogoGauge />
          <p>
            © 2026{' '}
            <span className="font-display text-ink">
              Car<span className="italic" style={{ color: '#B0791D' }}>gent</span>
            </span>
            {' '}— AI ocenění, popisky, monitoring i skaut v jednom rozhraní.
          </p>
        </span>
        <nav aria-label="Doplňkové informace" className="cargent-mono flex flex-wrap items-center gap-2">
          {footerItems.map((item, index) => (
            <span className="inline-flex items-center gap-2" key={item}>
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span>{item}</span>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function FooterLogoGauge() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="#14171C" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="10" stroke="#B0791D" strokeWidth="1" strokeDasharray="1 3" />
      <line x1="16" y1="16" x2="22" y2="10" stroke="#B0791D" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="#B0791D" />
    </svg>
  );
}
