// Server-only — čte editovatelné texty (CMS) ze Supabase a slévá je s výchozími
// hodnotami z registry. Nikdy neimportovat z Client Component.
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { CONTENT_DEFAULTS, type ContentKey } from './registry';

export type ContentGetter = (key: ContentKey) => string;

/**
 * Načte všechny override texty z `site_content` a vrátí funkci `t(key)`,
 * která vrací override, nebo (když chybí) výchozí text z registry.
 *
 * Obalené v `cache()` → během jednoho serverového requestu se DB dotáže
 * jen jednou, i když getter zavolá víc komponent nezávisle na sobě.
 * Při jakékoliv chybě / nenakonfigurovaném Supabase tiše padá na výchozí texty.
 */
export const getSiteContent = cache(async (): Promise<ContentGetter> => {
  const overrides: Record<string, string> = {};

  if (hasSupabaseEnv()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from('site_content').select('key, value');
      for (const row of (data as { key: string; value: string }[] | null) ?? []) {
        if (typeof row.value === 'string') overrides[row.key] = row.value;
      }
    } catch (err) {
      console.error('[content] getSiteContent failed, using defaults:', err);
    }
  }

  return (key: ContentKey) => overrides[key] ?? CONTENT_DEFAULTS[key] ?? '';
});
