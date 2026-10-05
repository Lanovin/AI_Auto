# Neon migrace

SQL skripty pro Neon databázi (`DATABASE_URL`). Spouštějí se **ručně** v Neon
Console → SQL Editor, v pořadí podle číselného prefixu — stejná konvence jako
`supabase/migrations/`.

| Skript | Co dělá |
|---|---|
| `0000_market_scans.sql` | Sdílená cache skenů `market_scans` (dokumentace ručně vytvořené tabulky + index) |
| `0001_price_stats.sql` | Vlastní odvozená DB cenových statistik (`price_stats`) + index pro úklid `market_scans` |

Pozn.: tabulka `market_scans` byla na produkci vytvořena ručně před zavedením
této složky; `0000_market_scans.sql` ji zpětně dokumentuje; na produkci jen přidá index, pokud chybí.
