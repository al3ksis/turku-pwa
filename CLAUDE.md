# Turku PWA

## Project Context

Henkilökohtainen PWA-sovellus Turkuun liittyvällä hyödyllisellä tiedolla. Mobiili-first dark theme -design Revolut-henkisellä ulkoasulla.

**Tech stack:**
- React 18 + Vite 8
- Vanilla CSS (CSS variables)
- Netlify (hosting + serverless functions)

**Live:** https://resilient-jalebi-98750b.netlify.app/

---

## About This Project

Sovellus näyttää neljä widgettiä:

1. **Sää** - Open-Meteo API
   - Nykyinen sää (lämpötila, tuuli, sääkuvaus)
   - Tuntikohtainen ennuste (klikkaa avataksesi, swipettävä)
   - UV-indeksi värikoodattuna (matala/kohtalainen/korkea/erittäin korkea)
   - Siitepöly värikoodattuna (koivu, heinä, leppä)

2. **Bussit** - Digitransit Waltti API (GraphQL)
   - Tukee useita pysäkkejä (max 3)
   - Välilehdet pysäkkien välillä
   - Ei oletuspysäkkiä - käyttäjä lisää itse
   - Auto-refresh 30s välein
   - Pysäkki-ID:n voi syöttää ilman "FOLI:" -etuliitettä

3. **HC TPS** - hc.tps.fi ICS-kalenteri (seuraavat ottelut)

4. **Uutiset** - Yle RSS (Turku-alue, concept ID 18-176134)

**CORS-ratkaisut:**
- TPS ja Uutiset käyttävät Netlify Functions -proxyä (`/.netlify/functions/proxy`)
- Sää ja Bussit toimivat suoraan (API:t sallivat CORS)

**Ympäristömuuttujat:**
- `VITE_DIGITRANSIT_API_KEY` - Digitransit API-avain (Netlify + .env)

---

## Key Directories

```
src/
├── components/          # React-widgetit
│   ├── BusWidget.jsx    # Föli-bussit (usean pysäkin tuki, välilehdet)
│   ├── WeatherWidget.jsx # Sää + tuntikohtainen + UV + siitepöly
│   ├── TPSWidget.jsx    # HC TPS ottelut (ICS)
│   └── NewsWidget.jsx   # Yle Turku uutiset (RSS)
├── utils/
│   └── fetch.js         # fetchWithTimeout helper (10s timeout)
├── App.jsx              # Pääkomponentti
├── index.css            # Global dark theme + yhteiset tyylit
└── main.jsx             # React entry point

public/
├── manifest.json        # PWA manifest
├── foli-logo.svg        # Föli logo
├── tps-logo.svg         # TPS logo
└── yle-logo.svg         # Yle logo

netlify/
└── functions/
    └── proxy.js         # CORS proxy (TPS, Yle), 60s cache

.claude/
└── skills/
    └── design-review/   # UX/UI design review skill
```

---

## Standards

**Kieli:** Suomi UI:ssa, englanti koodissa (muuttujat, kommentit)

**CSS:**
- CSS variables (`--bg`, `--card`, `--accent`, `--accent-yellow`, `--accent-orange`, jne.)
- Mobile-first, max-width 430px
- Yhteiset tyylit index.css:ssä (.card, .btn-primary, .skeleton-row, @keyframes shimmer)
- Komponenttikohtaiset .css-tiedostot vain komponenttikohtaisille tyyleille

**API-integraatiot:**
- Virhetilat + loading-skeleton jokaisessa widgetissä
- Retry-nappi virhetilanteissa
- fetchWithTimeout (10s) kaikissa API-kutsuissa
- Auto-refresh busseille (30s)

**Widgetit:**
- Jokainen widget on itsenäinen komponentti
- Omat CSS-tiedostot (BusWidget.css, jne.)
- Käyttävät `.card`-luokkaa yhtenäiseen ulkoasuun
- Nimetyt vakiot magic numbereiden sijaan

---

## Common Commands

```bash
# Kehitys
npm run dev              # Käynnistä dev-palvelin (localhost:5173)
npm run build            # Tuotanto-build
npm run preview          # Esikatsele build

# Deploy
git push                 # Auto-deploy Netlifyyn

# Ympäristömuuttujat
# .env (lokaali, ei gitissä):
VITE_DIGITRANSIT_API_KEY=xxx

# Netlify Dashboard → Site settings → Environment variables
```

---

## Development Philosophy

### Best Simple System for Now (BSSN)

Kirjoita aina **yksinkertaisin järjestelmä, joka täyttää nykyiset tarpeet** — oikealla tasolla, ei enempää eikä vähempää.

---

### For Now — Älä ennakoi tulevaa

- Ratkaise nykytilanne, ei kuviteltuja tulevaisuuden tilanteita.
- Älä lisää yleistyksiä, joita ei tarvita nyt: rules engineä, state machinea, skaalausta tuhansille käyttäjille.
- Älä varaudu muuttuviin vaatimuksiin etukäteen — muuta koodia kun tarve muuttuu.
- Jokainen spekulatiivinen abstraktio hidastaa tulevaa muutosta.

---

### Simple — Poista, älä lisää

- Käytä vähimmäiskompleksisuutta nykyisiin vaatimuksiin.
- Jos jonkin voi poistaa ja järjestelmä toimii silti — poista se.
- Ei spekulatiivisia rajapintoja, ei liian geneerisiä tietotyyppejä, ei yleisiä ratkaisuja siellä missä spesifi koodi riittää.

---

### Best — Tee oikein, mutta kontekstin mukaan

- **Ydintoiminnallisuus**: korkea laatu, kestävyys, testit.
- **Kokeellinen ominaisuus**: kevyempi toteutus, mutta hallittu — ei hakkeroitu.

Kirjoita koodi CUPID-periaatteiden mukaan:

| Ominaisuus | Tarkoitus |
|---|---|
| **Composable** | Minimaaliset riippuvuudet |
| **Unix philosophy** | Tekee yhden asian selkeästi |
| **Predictable** | Käyttäytyminen ja virhetilanteet ovat ennakoitavia |
| **Idiomatic** | Käyttää teknologialle tuttuja käytäntöjä |
| **Domain-based** | Nimeäminen heijastaa liiketoimintakontekstia |

---

### Ohjeet

- Etsi pienin muutos, joka ratkaisee ongelman nyt.
- Suosi spesifiä yleisen sijaan.
- Älä toista koodia, mutta älä myöskään yhdistä asioita vain koska koodi näyttää samanlaiselta.
- Pidä domain-termit nimeämisessä etualalla.
- Kirjoita intention-paljastava koodi: lukijan pitää ymmärtää *mitä* ja *miksi*, ei vain *miten*.
- Refaktoroi kun tarve muuttuu — ei etukäteen.

---

### Vältä näitä

- Abstraktiokerroksia ilman selvää nykyistä tarvetta.
- Extension pointteja ja hook-mekanismeja ilman tiedossa olevaa käyttötapausta.
- Algoritmivalintoja hypoteettiselle kuormalle.
- Konfiguroitavuutta siellä, missä kovakoodattu arvo riittää.
