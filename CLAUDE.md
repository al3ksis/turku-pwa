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

1. **Sää** - Open-Meteo API (sää + Air Quality API UV/siitepöly)
2. **Bussit** - Digitransit Waltti API (GraphQL), vaatii API-avaimen
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
│   ├── BusWidget.jsx    # Föli-bussit (Digitransit API)
│   ├── WeatherWidget.jsx # Sää + UV + siitepöly
│   ├── TPSWidget.jsx    # HC TPS ottelut (ICS)
│   └── NewsWidget.jsx   # Yle Turku uutiset (RSS)
├── App.jsx              # Pääkomponentti
├── index.css            # Global dark theme + CSS variables
└── main.jsx             # React entry point

public/
├── manifest.json        # PWA manifest
├── foli-logo.svg        # Föli logo
├── tps-logo.svg         # TPS logo
└── yle-logo.svg         # Yle logo

netlify/
└── functions/
    └── proxy.js         # CORS proxy (TPS, Yle)
```

---

## Standards

**Kieli:** Suomi UI:ssa, englanti koodissa (muuttujat, kommentit)

**CSS:**
- CSS variables (`--bg`, `--card`, `--accent`, jne.)
- Mobile-first, max-width 430px
- Komponenttikohtaiset .css-tiedostot

**API-integraatiot:**
- Virhetilat + loading-skeleton jokaisessa widgetissä
- Retry-nappi virhetilanteissa
- Auto-refresh busseille (30s)

**Widgetit:**
- Jokainen widget on itsenäinen komponentti
- Omat CSS-tiedostot (BusWidget.css, jne.)
- Käyttävät `.card`-luokkaa yhtenäiseen ulkoasuun

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