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

Build se nahrává přes FTP na **levinger.cz/tipovacka/** (Wedos hosting).

```bash
npm run build
# Pak ručně FTP upload CELÉHO obsahu dist/ do /www/domains/levinger.cz/tipovacka/
# DŮLEŽITÉ: vždy nahrát všechny soubory z dist/assets/, ne jen některé
# (Vite chunky musí být v synchronizaci, jinak se rozbije import grafu)
```

### Pořadí uploadu (atomicita)
1. Nejdřív všechny `assets/*.js`, `assets/*.css`, obrázky a `api/wc.php`
2. Potom `.htaccess`
3. **Jako poslední** `index.html` — jinak může uživatel stáhnout HTML
   odkazující na ještě nenahraný JS bundle a dostane blank stránku

### Vite config
`vite.config.js` má nastavený `base: '/tipovacka/'` aby cesty fungovaly
v podadresáři. Hash router (`#/path`) zajišťuje, že se nemusí konfigurovat
Apache rewrite pro SPA routing. V kořenu domény je `.htaccess` s redirectem
`/` → `/tipovacka/`.

### `public/.htaccess` — cache pravidla pro Wedos ATS
Wedos má před webem **Apache Traffic Server (ATS)** edge cache. Bez tvrdě
nastavených pravidel posílá `Vary: User-Agent` a drží **samostatnou cache
entry per každý unikátní prohlížeč** — což je nebezpečné, protože jediná
corruptnutá entry zablokne všechny uživatele se stejným UA
(viz [Incident 2026-04-11](#-incident-2026-04-11--ats-cache-vary-user-agent)
níže).

`public/.htaccess` proto pro `/assets/*` dělá:
- `Header unset Vary` — žádný split cache per UA
- `Cache-Control: public, max-age=31536000, immutable` — assety jsou
  hash-named, můžou se cachovat navždy

Pro `*.html` nastavuje `Cache-Control: no-cache, no-store, must-revalidate`,
takže prohlížeč si HTML vždy revaliduje a nikdy nedrží staré odkazy
na neexistující chunky.

Vite automaticky kopíruje `public/.htaccess` do `dist/.htaccess`, takže při
standardním FTP uploadu obsahu `dist/` se nahraje i on. **FileZilla defaultně
skrývá tečkové soubory** — zapni „Zobrazit skryté soubory" v menu Server.

### CORS proxy
`public/api/wc.php` je PHP proxy pro football-data.org API. Bez něj by browser nemohl
volat API kvůli CORS (API dovoluje jen `localhost`). Proxy:
- Volá API server-side se skrytým API klíčem
- Vrací JSON s `Access-Control-Allow-Origin: *`
- Cache v `/tmp/` na 3 minuty (šetří API kvótu)

## 🚨 Incident 2026-04-11 — ATS cache + Vary: User-Agent

**Symptomy:** někteří uživatelé (hlavně první návštěvy na mobilu) viděli
blank stránku, nebo jen rozpis jmen bez reakce na kliknutí a v tabu se
donekonečna točil loading indicator. Jiní měli web bez problému.

**Root cause:** Wedos ATS edge cache standardně posílá
`Vary: User-Agent, Accept-Encoding` → drží samostatnou cached copy JS bundlu
per každý unikátní User-Agent string. Jedna z těch copies `index-r27-H9mZ.js`
se uložila **truncated** (pravděpodobně ATS vnitřní bug / network blip při
cache populaci) a od té chvíle všichni uživatelé se stejným UA dostávali
useklý JS → `Uncaught SyntaxError: Unexpected end of input` → nic nefungovalo.

**Fix (permanentní):**
1. Přidán `public/.htaccess` s `Header unset Vary` na všechny assety a
   `Cache-Control: no-cache` na HTML (viz sekce Deployment výše).
2. Přidán build marker `console.log('[tipovacka] build YYYY-MM-DD-x')`
   do `src/main.js` — umožňuje kdykoli vynutit nový hash bundlu rebuildem
   změnou stringu (ATS nemá v cache nic nového → stáhne si čerstvou verzi
   z origin).

**Jak ověřit že je fix aktivní:**
```bash
curl -sI https://levinger.cz/tipovacka/assets/index-XXXXX.js | grep -E 'Vary|Cache-Control'
# Musí být:
#   Cache-Control: public, max-age=31536000, immutable
#   (a žádný Vary header)
```

**Quick-unblock postup pro případné příští cache korupce:**
1. Změnit build marker string v `src/main.js` (datum + písmeno)
2. `npm run build` — Vite vygeneruje nový hash v názvu JS bundlu
3. FTP upload celého `dist/` (atomicky, v pořadí: assets → .htaccess → index.html)
4. Postižené uživatele nechat reload (dostanou nový HTML → nový JS URL, ATS
   ho ještě nikdy neviděl → čerstvé stažení z origin)

### Druhá vlna — chunk version mismatch (Vite multi-chunk gotcha)

Po nasazení `.htaccess` fixu se objevil druhý problém: jeden uživatel měl

```
Uncaught SyntaxError: The requested module './schedule-D5N2uG5C.js'
does not provide an export named 'o'
```

**Příčina:** Vite content-hash chunku je odvozený ze zdrojového kódu chunku,
ale **jména exportů jsou minified a mangling závisí na tom, co main bundle
importuje**. Když rebuildíš main bundle, mangling exportů ve sdíleném chunku
se může přerovnat — ale Vite mu dá stejný filename hash, protože *zdroj* se
nezměnil. User měl v browser cache (jako `immutable`) starou verzi `schedule-D5N2uG5C.js`
se starým manglingem. Nový main bundle vyžadoval export `o`, cached chunk
exportoval jen `a, c, i, l, n, r, s, t, u`. → JS error → blank stránka.

**Fix:** `vite.config.js` → `rollupOptions.output.manualChunks: () => 'index'`.
Vše se sloučí do jediného `.js` souboru, takže žádný cross-chunk version
mismatch už není ani teoreticky možný. Bundle je o ~13 kB větší (376 kB
místo 363 + 13 kB), ale pro malou SPA je to čistší a robustnější.
**NEPŘIDÁVAT zpět chunk splitting bez velmi dobrého důvodu.**

### Třetí vlna — freeze telefonu při startu

Po fixu chunků se objevil další problém: po zobrazení modal okna s výběrem
jména telefon zamrzl ~1 sekundu poté, co se objevila jména. Tři příčiny
najednou:

1. **Dvojí start routeru** — `main.js` volal `startRouter()` jednou
   bezpodmínečně a podruhé v callbacku po výběru hráče. Při startu bez
   vybraného hráče se tak **dashboard renderoval na pozadí pod modal oknem**
   a střílel 313+ Firestore dotazů (104× bank výpočet + 208× bet loady +
   1× winner bets) paralelně s tím, jak uživatel klikal na svoje jméno.

2. **Synchronní lavina Firebase volání po renderu** — `dashboard.js` po
   každém renderu okamžitě spouštěl 4 load funkce naráz (`loadBets`,
   `loadBank`, `loadWinner`, live snapshot listenery). Initial render
   72 karet skupin + KO byl sám o sobě tučný kus práce; přidat hned na to
   stovky network callbacků a JSON.stringify diffů → main thread block →
   freeze.

3. **Router race condition** — `playerProfile.js` má 30s `setInterval`
   který se cleanupuje až router zavolá vrácenou cleanup funkci. Cleanup
   se ale registroval v `.then()` async handleru — pokud uživatel navigoval
   pryč **dřív než await dokončil**, novější routa už měla svůj cleanup
   nastavený, a po doběhnutí starého handleru se přepsal cleanupem starého
   playerProfile. Výsledek: dashboardové listenery zaleakované, plus
   playerProfile interval pumpoval na pozadí navždy → 104 Firestore dotazů
   každých 30 sekund navíc.

**Fixy:**
- `main.js` — `startRouter()` se volá jen pokud `getPlayerName()` vrací
  hráče. Bez hráče se ukáže modal a router běží až po výběru.
- `dashboard.js` — load funkce + live listenery zabaleny v `setTimeout(fn, 500)`,
  aby se nejdřív stihl dokončit initial render dashboardu.
- `router.js` — token-based protection: každá navigace dostane monotónní
  ID a stale async handler nemůže přepsat `currentCleanup` novější routy.
  Pokud cleanup dorazí pozdě, zavolá se okamžitě (zabraňuje leaku
  intervalů a listenerů z rozpracované předchozí routy).

### Diagnostické nástroje v `index.html` a `main.js`

V `index.html` je inline `<script>` blok (před hlavním modulem), který:
- zachytí `window.error` a `unhandledrejection` → ukáže chybu **přímo na
  stránce jako červenou lištu dole** (funguje i když JS bundle vůbec
  nenaběhne, je to vanilla ES5)
- po 8s zkontroluje `window.__tipovackaBooted` — pokud není nastavený,
  ukáže timeout error s User-Agentem
- vpravo dole zobrazuje malý šedivý **build marker** (`build YYYY-MM-DD-x`),
  takže když uživatel pošle screenshot, hned vidíš jakou verzi má

V `main.js` je `console.log('[tipovacka] build YYYY-MM-DD-x')` a
`window.__tipovackaBooted = true`. **Build marker string měň při každém
deployi** (i.e. `-a`, `-b`, `-c`...) — když uživatel reportuje problém,
poznáš jakou verzi vidí.

Když někdo příště nahlásí blank stránku / nereagující UI:
1. Pošli mu link a řekni „pošli screenshot včetně dolního okraje"
2. Vidí build marker → má novou verzi → problém je v běhu (kód, listenery, atd.)
3. Vidí červenou lištu → máš error message + stack + UA, jdi rovnou po něm
4. Nevidí ani jedno → cache nebo network, hard-refresh / clear data

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
