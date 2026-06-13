import { Fragment, type ReactNode } from 'react';

/**
 * Vykreslí jednoduše formátovaný text z CMS:
 *   • nový řádek (\n) → <br/>
 *   • _text_          → <i>text</i>  (kurzíva — zlatý akcent v nadpisech)
 *
 * Záměrně minimální „markdown" — admin tak může bezpečně upravovat texty
 * v obyčejném textovém poli, aniž by mohl vložit libovolné HTML.
 */
export function RichText({ children }: { children: string }) {
  const lines = children.split('\n');

  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {renderItalics(line)}
        </Fragment>
      ))}
    </>
  );
}

function renderItalics(line: string): ReactNode[] {
  // Rozdělí na úseky _kurzíva_ vs. normální text.
  const parts = line.split(/(_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.length > 1 && part.startsWith('_') && part.endsWith('_')) {
      return <i key={i}>{part.slice(1, -1)}</i>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
