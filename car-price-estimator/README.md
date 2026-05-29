# 🚗 AutoCeny – Odhad ceny ojetých automobilů

Webová aplikace pro profesionální odhad ceny ojetých automobilů. Kombinuje Next.js obal s legacy HTML/JS nástroji a používá **Anthropic Claude** přes serverový proxy endpoint pro vyhledání aktuálních inzerátů a tržního kontextu.

---

## 📋 Jak to funguje

1. Vyplníte formulář s parametry vozu (značka, model, rok, km, stav, výbava…)
2. Kliknete na **Odhadnout cenu**
3. Aplikace zavolá Claude API, která prohledá internet a najde srovnatelné inzeráty
4. Zobrazí se detailní cenová analýza s doporučenou prodejní i nákupní cenou

---

## 🔑 Jak nastavit Anthropic API klíč

1. Přejděte na [console.anthropic.com](https://console.anthropic.com/)
2. Zaregistrujte se nebo se přihlaste
3. V sekci **API Keys** vytvořte nový klíč
4. Klíč začíná `sk-ant-...`
5. Uložte ho do souboru `.env.local` jako `ANTHROPIC_API_KEY=...`

> **Poznámka:** Klíč se čte pouze na serveru. Uživatelské rozhraní už neobsahuje pole pro ruční zadávání API klíče.

---

## 🚀 Jak spustit

### Varianta 1 – Next.js aplikace
```bash
npm install
npm run dev
```

Pak otevřete `http://localhost:3000`.

### Varianta 2 – Legacy HTML přes Live Server
1. Nainstalujte rozšíření [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Otevřete složku `car-price-estimator` ve VS Code
3. Klikněte pravým tlačítkem na `index.html` → **Open with Live Server**

### Varianta 3 – Libovolný statický server
```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve .
```

---

## 🔒 Nastavení API klíče

API klíč se načítá **centrálně na serveru** ze souboru `.env.local`. Browserové nástroje komunikují s interní route `/api/anthropic`, takže už není potřeba ani možné zadávat klíč ručně do UI.

Použijte `.env.example` jako vzor a vytvořte si lokální `.env.local` s proměnnou `ANTHROPIC_API_KEY`.

---

## 📁 Popis souborů

| Soubor | Popis |
|---|---|
| `src/app` | Next.js App Router stránky, wrappery a API route |
| `style.css` | Sdílené styly pro legacy HTML nástroje v iframe |
| `app.js` | Logika legacy ocenění auta a napojení na serverový proxy helper |
| `shared.js` | Sdílené utility pro data vozu, garáž, nastavení a Anthropic gateway |
| `.env.example` | Vzorový soubor s proměnnou prostředí pro API klíč |
| `README.md` | Tento soubor |

---

## ⚙️ Technické detaily

- **Interní API endpoint:** `/api/anthropic`
- **Upstream endpoint:** `https://api.anthropic.com/v1/messages`
- **Nástroj:** `web_search_20250305` pro živé vyhledávání trhu
- **Architektura:** Next.js wrapper + legacy HTML/JS nástroje
- **API klíč:** pouze server-side přes `ANTHROPIC_API_KEY`

---

## 📊 Výstup analýzy obsahuje

- **Doporučená prodejní cena** s rozsahem min–max
- **Nákupní cena pro autobazar**
- Zdůvodnění ceny na základě tržní situace
- Faktory ovlivňující cenu (pozitivní / negativní)
- **3–5 reálných srovnávacích inzerátů** z internetu
- Doporučení pro autobazar (prezentace, opravy, doba prodeje)
- Rizika a typické problémy daného modelu
