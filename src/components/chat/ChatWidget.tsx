'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageSquare, X } from 'lucide-react';
import { FAQ, matchFaq, type ChatFacts, type FaqItem } from '@/lib/chat/faq';

/**
 * David — pomocník v pravém dolním rohu.
 *
 * Nejdřív zkusí odpovědět z připravených odpovědí (FAQ v src/lib/chat/faq.ts) —
 * to je okamžité a nestojí nic. Teprve když dotaz nesedí na žádnou z nich,
 * pošle ho na /api/chat, kde odpovídá Claude Haiku se znalostí celého webu.
 */

type Msg = {
  id: string;
  role: 'user' | 'david';
  text: string;
  link?: { href: string; label: string };
  /** Odpověď se právě streamuje. */
  streaming?: boolean;
  error?: boolean;
};

const GREETING_KEY = 'cargent_david_greeted';
const HIDDEN_PREFIXES = ['/admin', '/legacy'];

/** Interní cesty, které v odpovědi převedeme na odkaz. */
const ROUTES: Record<string, string> = {
  '/odhad-ceny': 'Odhad ceny',
  '/cenik': 'Ceník',
  '/dashboard': 'Můj účet',
  '/kontakt': 'Kontakt',
  '/registrace': 'Registrace',
  '/prihlaseni': 'Přihlášení',
  '/zdroje-dat': 'Zdroje dat',
  '/podminky': 'Obchodní podmínky',
  '/ochrana-udaju': 'Ochrana údajů',
};

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [facts, setFacts] = useState<ChatFacts | null>(null);
  const [factsFailed, setFactsFailed] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  // ── Pozdrav u bubliny (jednou za relaci) ───────────────────────────
  useEffect(() => {
    if (hidden) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(GREETING_KEY) === '1';
    } catch { /* private mode */ }
    if (dismissed) return;
    const timer = window.setTimeout(() => setGreetingVisible(true), 6000);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  const dismissGreeting = useCallback(() => {
    setGreetingVisible(false);
    try { sessionStorage.setItem(GREETING_KEY, '1'); } catch { /* ignore */ }
  }, []);

  // Upoutávka na ocenění sedí ve stejném rohu — dokud je vidět, David mlčí.
  useEffect(() => {
    function onTeaser(e: Event) {
      setTeaserVisible(Boolean((e as CustomEvent<{ visible?: boolean }>).detail?.visible));
    }
    window.addEventListener('cargent:teaser', onTeaser);
    return () => window.removeEventListener('cargent:teaser', onTeaser);
  }, []);

  // ── Fakta (ceny) — načteme až při prvním otevření ──────────────────
  useEffect(() => {
    if (!open || facts || factsFailed) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/chat', { cache: 'no-store' });
        if (!res.ok) throw new Error('facts');
        const data = (await res.json()) as ChatFacts;
        if (active) setFacts(data);
      } catch {
        if (active) setFactsFailed(true);
      }
    })();
    return () => { active = false; };
  }, [open, facts, factsFailed]);

  // ── Otevření / zavření ────────────────────────────────────────────
  // Odkaz s #david otevře chat rovnou — jde na něj poslat člověka odkudkoli.
  useEffect(() => {
    if (hidden) return;
    function openFromHash() {
      if (window.location.hash === '#david') openChat();
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  function openChat() {
    dismissGreeting();
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{
        id: nextId(),
        role: 'david',
        text: 'Dobrý den, jsem David. Pomůžu vám zorientovat se v Cargentu — jak ocenění funguje, co stojí a co v něm najdete.\n\nVyberte si otázku, nebo se zeptejte vlastními slovy.',
      }]);
    }
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }

  const closeChat = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeChat();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeChat]);

  // Zavřít při přechodu na jinou stránku — ale ne hned po namountování,
  // jinak by zhasl chat otevřený přes #david.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    setOpen(false);
  }, [pathname]);

  // Autoscroll na konec
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // ── Odeslání ──────────────────────────────────────────────────────
  function pushUser(text: string) {
    setMessages((m) => [...m, { id: nextId(), role: 'user', text }]);
  }

  function answerFromFaq(item: FaqItem) {
    if (!facts) return false;
    setMessages((m) => [...m, { id: nextId(), role: 'david', text: item.answer(facts), link: item.link }]);
    return true;
  }

  async function askAi(history: Msg[], question: string) {
    setBusy(true);
    const replyId = nextId();
    setMessages((m) => [...m, { id: replyId, role: 'david', text: '', streaming: true }]);

    try {
      const asked: Msg = { id: nextId(), role: 'user', text: question };
      const payload = [...history, asked]
        .filter((m) => !m.error && m.text.trim())
        .slice(-8)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages((m) =>
          m.map((msg) =>
            msg.id === replyId
              ? { ...msg, streaming: false, error: true, text: data.error ?? 'Odpověď se nepodařilo načíst. Zkuste to prosím znovu.' }
              : msg,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, text: acc } : msg)));
      }

      setMessages((m) =>
        m.map((msg) =>
          msg.id === replyId
            ? {
                ...msg,
                streaming: false,
                text: acc.trim() || 'Na tohle bohužel neznám odpověď. Zkuste to prosím jinak, nebo nám napište přes /kontakt.',
              }
            : msg,
        ),
      );
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === replyId
            ? { ...msg, streaming: false, error: true, text: 'Spojení se přerušilo. Zkuste to prosím znovu.' }
            : msg,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleQuick(item: FaqItem) {
    if (busy) return;
    pushUser(item.question);
    if (!answerFromFaq(item)) {
      void askAi(messages, item.question);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    setInput('');
    const historyBefore = messages;
    pushUser(question);

    // Nejdřív zkus připravenou odpověď — zadarmo a okamžitě.
    const match = matchFaq(question);
    if (match && facts) {
      setMessages((m) => [...m, { id: nextId(), role: 'david', text: match.answer(facts), link: match.link }]);
      return;
    }
    void askAi(historyBefore, question);
  }

  if (hidden) return null;

  const showQuickQuestions = messages.filter((m) => m.role === 'user').length === 0;

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────── */}
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="David — pomocník Cargent"
          className="cargent-chat-panel fixed inset-x-3 bottom-3 top-16 z-50 flex flex-col overflow-hidden rounded-lg border border-line bg-surface sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[600px] sm:max-h-[calc(100vh-3rem)] sm:w-[390px]"
          style={{ boxShadow: 'var(--shadow-cargent)' }}
        >
          {/* Hlavička */}
          <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3.5">
            <Avatar />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight tracking-tight text-ink">David</p>
              <p className="flex items-center gap-1.5 text-[12px] text-dim">
                <span className="cargent-pulse inline-block h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden="true" />
                Pomocník Cargent
              </p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              aria-label="Zavřít chat"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-dim transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {/* Zprávy */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div aria-live="polite" aria-atomic="false" className="space-y-4">
              {messages.map((msg) => (
                <Bubble key={msg.id} msg={msg} />
              ))}
            </div>

            {showQuickQuestions ? (
              <div className="pt-1">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-faint">Časté otázky</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {facts ? (
                    // Zobrazíme jen nejčastější otázky, ať je vidět i vstupní pole.
                    // Zbytek se pozná z volně psaného dotazu (matchFaq).
                    FAQ.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleQuick(item)}
                        className="rounded-md border border-line-2 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                      >
                        {item.question}
                      </button>
                    ))
                  ) : factsFailed ? (
                    <p className="text-[13px] text-dim">Zeptejte se rovnou vlastními slovy.</p>
                  ) : (
                    [0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-[42px] animate-pulse rounded-md bg-paper-2" aria-hidden="true" />
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Vstup */}
          <form onSubmit={handleSubmit} className="shrink-0 border-t border-line p-3">
            <div className="flex items-end gap-2 rounded-md border border-line-2 bg-surface px-3 py-2 transition-colors focus-within:border-brass">
              <label className="sr-only" htmlFor="david-input">Váš dotaz</label>
              <textarea
                id="david-input"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={700}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Zeptejte se na cokoli o Cargentu…"
                className="max-h-[110px] min-h-[24px] flex-1 resize-none bg-transparent text-[14.5px] text-ink outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Odeslat dotaz"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brass text-white transition-colors hover:bg-brass-2 disabled:cursor-not-allowed disabled:bg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-faint">
              David je automatický pomocník. U konkrétního účtu nebo platby pište na{' '}
              <Link href="/kontakt" className="cargent-link text-dim hover:text-ink">kontakt</Link>.
            </p>
          </form>
        </div>
      ) : null}

      {/* ── Bublina s pozdravem ────────────────────────────────────── */}
      {!open && greetingVisible && !teaserVisible ? (
        <div className="cargent-teaser fixed bottom-[88px] right-4 z-40 flex max-w-[280px] items-start gap-2 rounded-lg border border-line bg-surface py-2.5 pl-3.5 pr-2 sm:bottom-24 sm:right-6" style={{ boxShadow: 'var(--shadow-cargent-2)' }}>
          <button
            type="button"
            onClick={openChat}
            className="text-left text-[13.5px] leading-snug text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            Můžu s něčím pomoct? Zeptejte se mě.
            <span className="mt-0.5 block text-[12px] text-dim">David, pomocník Cargent</span>
          </button>
          <button
            type="button"
            onClick={dismissGreeting}
            aria-label="Skrýt nabídku pomoci"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* ── Tlačítko ───────────────────────────────────────────────── */}
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={openChat}
          aria-label="Otevřít chat s Davidem"
          className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
          style={{ boxShadow: 'var(--shadow-cargent-2)' }}
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
}

// ── Bublina zprávy ─────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-3.5 py-2.5 text-[14px] leading-relaxed text-white">
          {msg.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <Avatar small />
      <div className="min-w-0 flex-1">
        <div
          className={[
            'rounded-lg rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed',
            msg.error ? 'border border-negative/20 bg-negative/5 text-negative' : 'bg-paper-2 text-ink',
          ].join(' ')}
        >
          {msg.text ? <Linkified text={msg.text} /> : <TypingDots />}
          {msg.streaming && msg.text ? (
            <span className="cargent-caret ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] bg-brass" aria-hidden="true" />
          ) : null}
        </div>

        {msg.link ? (
          <Link
            href={msg.link.href}
            className="mt-2 inline-flex rounded-md border border-line-2 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          >
            {msg.link.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Text s odstavci; interní cesty (/cenik…) převede na odkazy.
 * Model má zakázaný markdown, ale kdyby přesto proklouzl, zbavíme se značek,
 * ať se uživateli nezobrazují hvězdičky a mřížky.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '$2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,:;!?])/g, '$1$2')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '· ');
}

function Linkified({ text }: { text: string }) {
  const pattern = new RegExp(`(${Object.keys(ROUTES).join('|')})(?![\\w-])`, 'g');

  return (
    <>
      {stripMarkdown(text).split('\n').map((line, li) => {
        if (!line.trim()) return <span key={li} className="block h-2" aria-hidden="true" />;
        const parts = line.split(pattern);
        return (
          <span key={li} className="block">
            {parts.map((part, pi) =>
              ROUTES[part] ? (
                <Link key={pi} href={part} className="font-medium text-brass underline underline-offset-2 hover:text-brass-2">
                  {ROUTES[part]}
                </Link>
              ) : (
                <span key={pi}>{part}</span>
              ),
            )}
          </span>
        );
      })}
    </>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" role="status" aria-label="David píše odpověď">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="cargent-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-faint"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

function Avatar({ small = false }: { small?: boolean }) {
  const size = small ? 28 : 36;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="17" fill="var(--color-ink)" />
      <circle cx="18" cy="18" r="13" fill="none" stroke="var(--color-brass)" strokeWidth="1" strokeDasharray="1 3" />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="14"
        fontWeight="700"
        fill="#FFFFFF"
      >
        D
      </text>
    </svg>
  );
}
