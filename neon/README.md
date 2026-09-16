# Neon migrace

SQL skripty pro Neon databázi (`DATABASE_URL`). Spouštějí se **ručně** v Neon
Console → SQL Editor, v pořadí podle číselného prefixu — stejná konvence jako
`supabase/migrations/`.

| Skript | Co dělá |
|---|---|
| `0000_market_scans.sql` | Sdílená technická cache skenů (`market_scans`) — spustit jako první |
| `0001_price_stats.sql` | Vlastní odvozená DB cenových statistik (`price_stats`) + index pro úklid `market_scans` |

Bez `DATABASE_URL` aplikace funguje dál (cache i statistiky se jen přeskočí
a do logu jde chyba) — ale každé ocenění pak platí plnou cenu za AI, i když
stejné auto někdo ocenil před hodinou.
