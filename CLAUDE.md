# Cargent — Claude Code instrukce

## Projekt
B2B SaaS pro česká autobazarová dealerství. Oceňovací nástroj s AI. Next.js 15 App Router, TypeScript, Tailwind v4 (CSS-first).

## Při jakékoli práci na UI
**Nejdřív načti `.claude/skills/cargent-design/SKILL.md` a drž se ho přesně.**

Klíčové body:
- Paleta: white/navy/modrá (brass = #2563EB, ne zlatá)
- Font: Hanken Grotesk (display+body), Spline Sans Mono (data)
- Signature: gauge/ciferník SVG — hero = gauge, ne "číslo + gradient"
- Copy: česky, konkrétně, bez hype, sentence case
- Zakázáno: gradienty, grid pozadí, velké barevné plochy, serif

## Agenti (v .claude/agents/)
- `design-system-architect` — strategické design rozhodnutí
- `layout-specialist` — struktura stránek, shell, navigace
- `ui-component-builder` — komponenty (použít AŽ po design skillu)
- `micro-interaction-designer` — loading stavy, animace, polish
- `a11y-responsive-auditor` — před mergem, WCAG 2.1 AA
- `visual-qa-reviewer` — finální QA před shipem

## Tech stack
- Next.js 15, React 19, TypeScript
- Tailwind v4 (CSS-first @theme v globals.css)
- Stripe pro platby
- Edge runtime pro API routes kde možné

## Workflow
Plan Mode (Opus) → plán → Sonnet build po sekcích → screenshot → kritika proti design skillu → iterace → merge
