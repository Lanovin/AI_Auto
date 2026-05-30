import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHead } from './HowItWorks';
import { API_REQUEST_SAMPLE, API_RESPONSE_SAMPLE } from '@/data/demo';

/**
 * B2B / API — the ONLY dark section on the page. Acts as visual punctuation:
 * everything before and after sits on paper/cream, this one breaks the rhythm
 * with ink-black background so readers feel the change of mode (marketing →
 * developer-facing).
 *
 * Right column shows a fake API request + response in tabular mono, with
 * lightweight syntax colouring done via spans (no external highlighter).
 */
export default function B2B() {
  return (
    <section id="api" className="px-[22px] py-24 md:px-8 md:py-32">
      <div
        className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[24px] bg-ink px-8 py-14 text-white md:px-12 md:py-20"
        style={{ boxShadow: 'var(--shadow-cargent)' }}
      >
        {/* Brass glow in the corner — premium accent on dark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] opacity-50 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle at center, rgba(176, 121, 29, 0.55), rgba(176, 121, 29, 0) 70%)',
          }}
        />

        <div className="relative grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
          {/* ── Left column: copy ─────────────────────────────────── */}
          <div>
            <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-brass">
              — Pro firmy &amp; API
            </span>
            <h2 className="cargent-h2 mt-4 text-[36px] text-white md:text-[48px] lg:text-[52px]">
              Zapojte Cargent
              <br />
              do <i>svých systémů.</i>
            </h2>
            <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-white/75 md:text-[16px]">
              REST API s předvídatelnou strukturou odpovědí, batchové
              oceňování pro celé fleety, webhooky na změny tržní hodnoty.
              Bez vendor lock-inu, s SLA a privátním datovým protokolem.
            </p>

            <Link
              href="mailto:hello@cargent.cz?subject=Demo%20Cargent%20API"
              className="group mt-8 inline-flex items-center gap-2 rounded-[12px] bg-brass px-5 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Domluvit demo
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>

            <ul className="mt-10 grid gap-3 text-[13px] text-white/65 sm:grid-cols-2">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brass" aria-hidden="true" />
                <span>p99 latence pod 380 ms</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brass" aria-hidden="true" />
                <span>Batch endpoint pro fleety</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brass" aria-hidden="true" />
                <span>SSO &amp; on-prem nasazení na vyžádání</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brass" aria-hidden="true" />
                <span>Datový residuál v EU (Praha)</span>
              </li>
            </ul>
          </div>

          {/* ── Right column: code block ──────────────────────────── */}
          <div className="rounded-[16px] border border-paper/10 bg-[#0E1014] p-4 md:p-5">
            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-paper/10 px-2 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-paper/10" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-paper/10" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-brass/60" aria-hidden="true" />
              </div>
              <span className="cargent-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                cargent.cli — request
              </span>
            </div>

            {/* Request */}
            <pre className="cargent-mono overflow-x-auto px-2 py-4 text-[12.5px] leading-[1.65]">
              <code>
                <HighlightedRequest text={API_REQUEST_SAMPLE} />
              </code>
            </pre>

            {/* Response divider */}
            <div className="flex items-center gap-3 border-y border-paper/10 px-2 py-2">
              <span className="cargent-mono text-[10px] uppercase tracking-[0.12em] text-emerald">
                ← 200 OK
              </span>
              <span className="cargent-mono text-[10px] text-white/40">application/json</span>
            </div>

            {/* Response */}
            <pre className="cargent-mono overflow-x-auto px-2 py-4 text-[12.5px] leading-[1.65]">
              <code>
                <HighlightedJson text={API_RESPONSE_SAMPLE} />
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Lightweight syntax highlighters (no library, regex on lines) ────

const KEYWORD_COLOR = 'text-brass';
const STRING_COLOR = 'text-emerald';
const NUMBER_COLOR = 'text-[#9CC4FF]';
const COMMENT_COLOR = 'text-white/40';
const PUNCT_COLOR = 'text-white/55';

/** Render a HTTP request: method/path on first line, headers, JSON body. */
function HighlightedRequest({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        // First line: METHOD /path
        if (i === 0) {
          const [method, ...rest] = line.split(' ');
          return (
            <div key={i}>
              <span className={KEYWORD_COLOR}>{method}</span>
              <span className="text-white/85"> {rest.join(' ')}</span>
            </div>
          );
        }
        // Header line: "Header: value"
        if (/^[A-Z][A-Za-z-]+:/.test(line)) {
          const [name, ...rest] = line.split(':');
          return (
            <div key={i}>
              <span className="text-white/55">{name}:</span>
              <span className="text-white/80">{rest.join(':')}</span>
            </div>
          );
        }
        // Empty separator
        if (line.trim() === '') {
          return <div key={i}>&nbsp;</div>;
        }
        // JSON body line
        return <JsonLine key={i} line={line} />;
      })}
    </>
  );
}

function HighlightedJson({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <JsonLine key={i} line={line} />
      ))}
    </>
  );
}

/**
 * Single line of JSON, hand-tokenised. Good enough for a fake snippet —
 * recognises: string keys, string values, numbers, booleans, brackets, commas.
 */
function JsonLine({ line }: { line: string }) {
  // Comments (// ...) — render whole line dim, no further tokens.
  if (line.trim().startsWith('//')) {
    return <div className={COMMENT_COLOR}>{line}</div>;
  }

  // Match key: value with optional trailing comma.
  // Captures: indent, key, separator, value, trailing
  const match = line.match(/^(\s*)("[^"]*"|\w+)?(\s*:\s*)?(.*?)(,?)\s*$/);
  if (!match) {
    return <div className={PUNCT_COLOR}>{line}</div>;
  }
  const [, indent, key, sep, value, trailing] = match;

  // Pure brackets / closing lines
  if (!key && /^[{}\[\],]+$/.test(value.trim())) {
    return (
      <div>
        <span>{indent}</span>
        <span className={PUNCT_COLOR}>{value}</span>
      </div>
    );
  }

  return (
    <div>
      <span>{indent}</span>
      {key ? <span className={STRING_COLOR}>{key}</span> : null}
      {sep ? <span className={PUNCT_COLOR}>{sep}</span> : null}
      <TokenisedValue value={value} />
      {trailing ? <span className={PUNCT_COLOR}>{trailing}</span> : null}
    </div>
  );
}

function TokenisedValue({ value }: { value: string }) {
  const v = value.trim();
  if (!v) return null;

  // Bool / null
  if (/^(true|false|null)$/.test(v)) {
    return <span className={KEYWORD_COLOR}>{value}</span>;
  }
  // Number (possibly with leading whitespace preserved by parent)
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    return <span className={NUMBER_COLOR}>{value}</span>;
  }
  // String
  if (v.startsWith('"')) {
    return <span className={STRING_COLOR}>{value}</span>;
  }
  // Array literal — split, colour each item
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1);
    const items = inner.split(',').map((s) => s.trim());
    return (
      <>
        <span className={PUNCT_COLOR}>[</span>
        {items.map((it, i) => (
          <span key={i}>
            <TokenisedValue value={it} />
            {i < items.length - 1 ? <span className={PUNCT_COLOR}>, </span> : null}
          </span>
        ))}
        <span className={PUNCT_COLOR}>]</span>
      </>
    );
  }
  // Brackets only
  if (/^[{}\[\]]+$/.test(v)) {
    return <span className={PUNCT_COLOR}>{value}</span>;
  }
  return <span className="text-white/80">{value}</span>;
}
