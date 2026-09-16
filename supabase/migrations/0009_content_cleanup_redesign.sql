-- Spusť ručně v Supabase Dashboard → SQL Editor (nepovinné, jen úklid).
-- Redesign úvodní stránky (září 2026) odstranil sekce Pruh důvěry, Proč věřit
-- ceně a závěrečnou výzvu. Jejich CMS overridy už nic nezobrazuje — smažeme je,
-- aby admin CMS nedržel osiřelé texty.
delete from public.site_content
where key like 'trust.%'
   or key like 'engine.%'
   or key like 'cta.%'
   or key like 'hero.metric.%'
   -- položky přehledu platformy dostaly nový obsah i klíče (features.list.N.*)
   or key ~ '^features\.[0-9]\.(title|body)$';
