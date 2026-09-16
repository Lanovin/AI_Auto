/**
 * Minimalistický, bezpečný převod markdownu z posudku na HTML.
 * Vstup se NEJDŘÍV escapuje (žádné HTML z modelu se nevykreslí), pak se
 * aplikují jen podporované konstrukce: nadpisy, tučné, kurzíva, tabulky,
 * seznamy, odkazy (jen http/https), vodorovná čára, odstavce.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Emoji z nadpisů pryč — design Cargent je bez emoji, model je občas přidá.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

function inline(text: string): string {
  let t = text;
  // odkazy [text](https://…)
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="nofollow noopener noreferrer">$1</a>');
  // holé URL
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="nofollow noopener noreferrer">$2</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  t = t.replace(/_([^_\n]{2,})_/g, '<em>$1</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

const NUMERIC_CELL = /^[\s\d.,+\-−–%]*(?:Kč|km|kW|%|l|tis\.?)?\s*$/i;

export function renderMarkdown(md: string): string {
  const src = escapeHtml(md.replace(EMOJI_RE, '').replace(/\r\n/g, '\n'));
  const lines = src.split('\n');
  const out: string[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length) {
      out.push(`<p>${inline(buf.join(' '))}</p>`);
      buf.length = 0;
    }
  };

  const para: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flushParagraph(para); i++; continue; }

    // Nadpisy
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushParagraph(para);
      const level = Math.min(Math.max(h[1].length, 2), 3);
      out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      i++; continue;
    }

    // Vodorovná čára
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { flushParagraph(para); out.push('<hr />'); i++; continue; }

    // Tabulka: řádek s | následovaný oddělovačem |---|
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      flushParagraph(para);
      const parseRow = (r: string) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      const numericCols = headers.map((_, ci) => rows.length > 0 && rows.every((r) => !r[ci] || NUMERIC_CELL.test(r[ci])));
      const th = headers.map((c, ci) => `<th${numericCols[ci] ? ' class="num"' : ''}>${inline(c)}</th>`).join('');
      const tb = rows
        .map((r) => `<tr>${headers.map((_, ci) => `<td${numericCols[ci] ? ' class="num"' : ''}>${inline(r[ci] ?? '')}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`);
      continue;
    }

    // Seznamy (odrážky i číslované), včetně jednoduchého odsazení
    if (/^([-*•]|\d+[.)])\s+/.test(trimmed)) {
      flushParagraph(para);
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        const indent = lines[i].match(/^\s*/)?.[0].length ?? 0;
        const content = lines[i].trim().replace(/^([-*•]|\d+[.)])\s+/, '');
        items.push(`<li${indent >= 2 ? ' class="sub"' : ''}>${inline(content)}</li>`);
        i++;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    para.push(trimmed);
    i++;
  }
  flushParagraph(para);

  return out.join('\n');
}
