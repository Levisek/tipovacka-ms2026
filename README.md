# Tipovačka MS 2026

Webová tipovačka pro fotbalové **Mistrovství světa 2026** v USA, Kanadě a Mexiku.
Postavená pro partu kamarádů "Pískové doly" — navazuje na tradici z MS 2022 a Eura 2024.

🌐 **Live**: [levinger.cz/tipovacka](https://levinger.cz/tipovacka/)

## ✨ Funkce

### Tipovačka
- **Tipování zápasů** s deadlinem 1,5 hodiny před prvním zápasem hracího dne
- **Zamykání tipů** po odeslání s možností úprav (tlačítko ✎) až do deadline
- **Live odpočet** do uzavření tipovacího okénka, poslední hodinu celý banner červený a pulzuje
- **Bank hero box** s glow/shimmer animací když je v banku něco, mdlý styl když je prázdný
- **Tip na celkového vítěze** turnaje — samostatný bank s přenosem 700 Kč z Eura 2024
- **Tipy ostatních hráčů** viditelné po deadline NEBO po zadání výsledku zápasu
- **Live updates** přes Firebase real-time listenery — když někdo tipne, ostatní to vidí okamžitě
- **Indikace vypadnutých tipů** během live zápasu — pokud aktuální skóre přesahuje tip, je přeškrtnuté
- **Highlight pro Česko** 🇨🇿 — naše zápasy mají modrý border, gradient pozadí a zlaté jméno

### Žebříček (live)
- **Dominantní bank box** se zlatým glow efektem (sjednoceno s tipovačkou)
- **Pohyby v tabulce** — šipky ▲ nahoru / ▼ dolů podle změn pořadí (snapshot v localStorage)
- **Dvě tabulky**: Správné tipy + Finanční bilance
- **Bank z neúspěšných tipů** ze skupin se přenáší do vyřazovací fáze
- **Auto-update** při změně výsledků v matchStore

### Vítěz (samostatný tab)
- **Bank na vítěze** s carry-overem 700 Kč z Eura 2024 + 100 Kč × hráč
- **Tabulka tipů** všech hráčů s indikací stavu:
  - ✓ Ve hře
  - ❌ Vypadl (tým prohrál KO zápas / nepostoupil ze skupiny)
  - 🏆 Vítěz!

### Rozpis
- Kompletní rozpis 104 zápasů MS 2026 (12 skupin po 4 týmech)
- Filtrování podle fáze (skupiny / vyřazovačka)
- Klikem na zápas detail

### Pravidla
- Detailní popis sázek, banku, výhry, deadline
- Kalkulace maximálního vkladu pro MS 2026
- Způsob platby ve dvou částech

### Archiv
- **MS 2022** v Kataru (8 hráčů, sázka 10 Kč/zápas + 40 Kč/KO zápas)
- **Euro 2024** v Německu (7 hráčů, sázka 20 Kč/zápas + 40 Kč/KO zápas)
- Tabulky správných tipů a finanční bilance
- Rozbalovací sekce s pravidly pro daný turnaj

### Admin
- **Přehled plateb** s checkboxy pro každého hráče (dvě platby)
- **Stáhnout výsledky z API** (football-data.org)
- **Tipy hráčů** — všechny tipy z Firebase, automatické načtení
- **Zadat výsledek ručně** — výběr zápasu z dropdown + skóre
- **Naplnit testovací tipy** — pro testování (přidává tipy, nemaže nic)
- **Vyčistit lokální cache** — smaže lokálně uložené výsledky a snapshot žebříčku
- Heslo: viz `src/views/admin.js` (nepsat veřejně)
- **Žádná destruktivní operace** v UI — nikdo nemůže nic smazat, jen přepisovat tipy do deadline

## 💰 Pravidla sázení (MS 2026)

| Položka | Sázka | Počet | Max vklad |
|---------|-------|-------|-----------|
| Základní skupiny | 20 Kč/zápas | 72 zápasů | 1 440 Kč |
| Vyřazovací fáze | 40 Kč/zápas | 32 zápasů | 1 280 Kč |
| Tip na vítěze | 100 Kč | 1× | 100 Kč |
| **Celkem max** | | | **2 820 Kč** |

### Mechanika banku
1. **Sázka je vždy za zápas**, ne za hrací den
2. **Bank zápasu** = počet hráčů, kteří tipovali × sázka
3. Vyhrává hráč, který tipne **přesný výsledek** — bere celý bank
4. Pokud trefí **víc hráčů**, bank se rovnoměrně rozdělí
5. Pokud **nikdo netrefí**, bank přechází do dalšího zápasu (kumuluje se)
6. Bank z neúspěšných tipů ve skupinách **přechází do vyřazovací fáze**
7. Tip na vítěze: kdo trefí, bere celý winner bank (carry-over + 100 × hráči)

## 🛠 Tech stack

- **Vite 8** — build tool, dev server
- **Vanilla JavaScript** — bez frameworku, jen ES modules
- **Firebase 12** (Firestore) — real-time databáze tipů
- **CSS variables** — světlý/tmavý mód podle systémového nastavení
- **Hash router** — vlastní jednoduchý SPA router (`#/route`)
- **Apache** hosting na Wedos webhostingu

## 📁 Struktura

```
src/
├── main.js              # Entry point, registrace rout
├── router.js            # Hash-based SPA router
├── style.css            # Globální styly + dark mode
│
├── config/
│   ├── constants.js     # Centrální konstanty (PIN, klíče, intervaly, …)
│   ├── firebase.js      # Firebase config
│   ├── schedule.js      # Rozpis 104 zápasů MS 2026 (placeholder, přepíše se z API)
│   ├── teams.js         # 48 týmů s vlajkami + HOME_TEAM = 'Česko'
│   ├── archive2022.json # Data z MS 2022
│   └── archiveEuro2024.json
│
├── services/
│   ├── auth.js                # Player select (localStorage)
│   ├── betService.js          # Firebase CRUD pro tipy (read-only deletes)
│   ├── matchStore.js          # Centrální store výsledků + schedule overrides
│   ├── resultService.js       # API klient (přes PHP proxy v produkci)
│   ├── standingsService.js    # Live výpočet žebříčku s carry-over
│   └── playerStatsService.js  # Statistiky pro profil hráče
│
├── components/
│   ├── nav.js           # Navigace + hamburger menu
│   ├── matchCard.js     # Karta zápasu s tipem (highlight Česko)
│   ├── betForm.js       # Formulář pro tipnutí + edit handler
│   ├── countdown.js     # Odpočet do deadline
│   └── winnerBet.js     # Tip na vítěze (form / lock)
│
└── views/
    ├── dashboard.js       # Hlavní stránka — tipovačka
    ├── standings.js       # Live žebříček s pohyby ▲▼
    ├── winner.js          # Tip na vítěze (samostatný tab)
    ├── schedule.js        # Rozpis zápasů po skupinách
    ├── rules.js           # Pravidla
    ├── archive.js         # Archiv MS 2022 + Euro 2024
    ├── admin.js           # Admin panel
    ├── matchDetail.js     # Detail zápasu
    └── playerProfile.js   # Profil hráče se statistikami

public/
└── api/
    └── wc.php           # PHP proxy pro football-data.org API (CORS + cache)
```

## 🔥 Firestore schéma

```
matches/
  {matchId}/
    bets/
      {playerId}: { homeScore, awayScore, timestamp, locked }

winnerBets/
  {playerId}: { team, timestamp }
```

Pravidla v testovacím režimu (do 10. května 2026, R/W bez auth).

## 🚀 Vývoj

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # produkční build do dist/
```

## 📦 Deployment

Build se nahrává přes FTP na **levinger.cz/tipovacka/**.

```bash
npm run build
# Pak ručně FTP upload CELÉHO obsahu dist/ do /www/domains/levinger.cz/tipovacka/
# DŮLEŽITÉ: vždy nahrát všechny soubory z dist/assets/, ne jen některé
# (Vite chunky musí být v synchronizaci, jinak se rozbije import grafu)
```

`vite.config.js` má nastavený `base: '/tipovacka/'` aby cesty fungovaly v podadresáři.
Hash router (`#/path`) zajišťuje, že se nemusí konfigurovat Apache rewrite.

V kořenu domény je `.htaccess` s redirectem `/` → `/tipovacka/`.

### CORS proxy
`public/api/wc.php` je PHP proxy pro football-data.org API. Bez něj by browser nemohl
volat API kvůli CORS (API dovoluje jen `localhost`). Proxy:
- Volá API server-side s skrytým API klíčem
- Vrací JSON s `Access-Control-Allow-Origin: *`
- Cache v `/tmp/` na 3 minuty (šetří API kvótu)

## 🎨 Témata

- **Světlý mód** — výchozí
- **Tmavý mód** — automaticky podle `prefers-color-scheme: dark`
- Použity **FIFA 2026 oficiální barvy** (červená, zelená, modrá, sky, žlutá, oranžová, lime)

## 🔐 Auth a hráči

- Žádný registrační systém — hráč si vybere své jméno z přednastaveného seznamu
- Jméno se uloží do localStorage a používá jako identifikátor pro Firebase
- Klikatelný badge s jménem v navigaci → modal pro přepnutí hráče
- Admin je chráněný PIN (viz `src/config/constants.js` → `ADMIN_PIN`)

## 👤 Profil hráče

Klik na jméno hráče v žebříčku, archivu nebo tipech na vítěze otevře `/#/player/Jmeno`:
- Aktuální MS 2026 statistiky (pozice, bilance, úspěšnost, parťák do banku)
- Tip na vítěze s 🇨🇿 highlighten
- Historie z MS 2022 + Euro 2024 (počet tipů, výhry)
- 💀 Nejdelší šňůra netrefení (chronologicky přes všechny turnaje)
- 🎯 Oblíbený výsledek
- **Live updates** — sleduje matchStore změny + auto-refetch každých 30s

## 📊 Archiv tipovaček

| Turnaj | Hráčů | Vítěz | Pravidla |
|--------|-------|-------|----------|
| MS 2022 (Katar) | 8 | Argentina | 10 Kč skupiny, 40 Kč KO/zápas |
| Euro 2024 (Německo) | 7 | Španělsko | 20 Kč skupiny, 40 Kč KO/zápas |
| **MS 2026** (USA/CAN/MEX) | 7 | ? | **20 Kč skupiny, 40 Kč KO/zápas** |

## 📝 License

Soukromý projekt pro partu kamarádů. Repo veřejné jen pro Claude Code historii.
