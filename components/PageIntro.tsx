import Link from 'next/link';
import type { ReactNode } from 'react';

type PageIntroAction = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
};

type PageIntroStat = {
  value: string;
  label: string;
};

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  tone?: 'people' | 'dealer';
  hideSummary?: boolean;
  actions?: PageIntroAction[];
  actionsSlot?: ReactNode;
  summaryBadge?: string;
  summaryTitle?: string;
  summaryText?: string;
  summaryItems?: string[];
  stats?: PageIntroStat[];
};

export default function PageIntro({
  eyebrow,
  title,
  description,
  tone = 'people',
  hideSummary = false,
  actions = [],
  actionsSlot,
  summaryBadge,
  summaryTitle,
  summaryText,
  summaryItems = [],
  stats = []
}: PageIntroProps) {
  const hasSummary = !hideSummary && (summaryBadge || summaryTitle || summaryText || summaryItems.length > 0 || stats.length > 0);

  return (
    <section className="page-intro-section">
      <div className="container">
        <div className="hero-panel page-intro-panel">
          <div className={hasSummary ? 'page-intro-grid' : 'page-intro-grid page-intro-grid-single'}>
            <div className="hero-copy">
              <span className="eyebrow" data-tone={tone === 'dealer' ? 'dealer' : undefined}>
                {eyebrow}
              </span>
              <h1 className="page-title">{title}</h1>
              <p className="page-lead">{description}</p>
              {actionsSlot ? (
                actionsSlot
              ) : actions.length > 0 ? (
                <div className="hero-actions">
                  {actions.map((action) => (
                    <Link className={action.variant === 'secondary' ? 'hero-secondary' : 'hero-primary'} href={action.href} key={action.label}>
                      {action.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {hasSummary ? (
              <aside className="hero-card page-intro-side">
                {summaryBadge ? (
                  <span className="audience-badge" data-tone={tone}>
                    {summaryBadge}
                  </span>
                ) : null}
                {summaryTitle ? <strong>{summaryTitle}</strong> : null}
                {summaryText ? <p className="page-summary-copy">{summaryText}</p> : null}
                {summaryItems.length > 0 ? (
                  <ul className="page-summary-list">
                    {summaryItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {stats.length > 0 ? (
                  <div className="page-stat-grid">
                    {stats.map((stat) => (
                      <article className="page-stat-card" key={stat.label}>
                        <span className="page-stat-value">{stat.value}</span>
                        <span className="page-stat-label">{stat.label}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}