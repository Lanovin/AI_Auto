# Neon migrace

SQL skripty pro Neon databázi (`DATABASE_URL`). Spouštějí se **ručně** v Neon
Console → SQL Editor, v pořadí podle číselného prefixu — stejná konvence jako
`supabase/migrations/`.

| Skript | Co dělá |
|---|---|
| `0001_price_stats.sql` | Vlastní odvozená DB cenových statistik (`price_stats`) + index pro úklid `market_scans` |

Pozn.: tabulka `market_scans` (sdílená cache skenů) byla vytvořena ručně před
zavedením této složky; její definici dokumentuje `src/lib/market-cache.ts`.
