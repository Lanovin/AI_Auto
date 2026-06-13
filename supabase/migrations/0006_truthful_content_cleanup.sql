-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0004_admin_cms.sql spuštěnou před tímto skriptem.
--
-- Pravdivost marketingových textů (ochrana spotřebitele / nekalé obchodní
-- praktiky): výchozí texty v kódu (src/lib/content/registry.ts) byly nahrazeny
-- pravdivými claimy — místo smyšlených „180 000+ vozů v databázi" a „± 4 %
-- přesnost" nyní web uvádí skutečnost (živý web search nad až 8 portály,
-- min–max pásmo s odkazy na zdroje).
--
-- Tento skript smaže případné DB overridy starých placeholderů, aby se
-- nepravdivé claimy nemohly vrátit přes admin CMS. Admin si texty může
-- v /admin znovu upravit — ale začne od pravdivých výchozích hodnot.

delete from public.site_content
where key in (
  'hero.subtitle',
  'hero.metric.0.value', 'hero.metric.0.label',
  'hero.metric.1.value', 'hero.metric.1.label',
  'hero.metric.2.value', 'hero.metric.2.label',
  'trust.0.stat', 'trust.0.label',
  'trust.1.stat', 'trust.1.label',
  'trust.2.label',
  'trust.3.stat', 'trust.3.label',
  'how.step.1.body',
  'engine.reason.0.stat', 'engine.reason.0.title', 'engine.reason.0.body',
  'engine.reason.1.stat', 'engine.reason.1.title', 'engine.reason.1.body',
  'engine.reason.2.stat', 'engine.reason.2.title', 'engine.reason.2.body',
  'engine.reason.3.title', 'engine.reason.3.body'
);
