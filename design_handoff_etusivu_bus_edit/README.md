# Handoff: Etusivu · "Seuraavat bussit" -muokkaustila (Bussit-driven)

## Overview

Tämä handoff määrittelee, miten käyttäjä hallitsee sitä, **mitkä pysäkit
näkyvät etusivun "Seuraavat bussit" -listassa**.

Ratkaisun ydin: **Bussit-välilehti on master-paikka pysäkkien hallintaan**
(lisäys, poisto, järjestys, seurattavat linjat). Etusivun "Muokkaa" on
yksinkertainen valinta — checkbox-lista, jolla käyttäjä päättää **mitkä
hänen olemassa olevista pysäkeistään näytetään etusivulla** nopeaa
vilkaisua varten.

Aiemmasta versiosta poistetaan etusivulta:
- drag-and-drop -järjestäminen (järjestys = Bussit-listan järjestys)
- "+ Lisää pysäkki" -rivi (lisäys vain Bussit-näkymässä)
- pysäkin poisto (poisto vain Bussit-näkymässä; etusivulta voi vain piilottaa)

## About the Design Files

Tiedostot kansiossa `reference/` ovat **HTML + inline JSX -muodossa
toteutettuja design-referenssejä** (React Babel standalonella). Ne ovat
prototyyppejä, jotka kuvaavat halutun ulkoasun ja käyttäytymisen — **eivät
suoraan kopioitavaa tuotantokoodia**.

Olemassa olevassa Turku PWA -koodikannassa on jo oma React-komponenttirakenne,
design-tokenit (CSS custom properties tiedostossa `src/index.css` /
`src/App.css`), ja oma datakerros (Föli HSL-rajapinnat busseille,
localStorage suosikkipysäkeille). Tämä handoff kuvaa, miten **nämä designit
toteutetaan kyseisen koodikannan päälle** sen omilla konventioilla.

Jos olet epävarma minne joku kuuluu (custom hook, util, komponentti),
suosi koodikannan olemassa olevia tapoja sen sijaan, mitä mock tekee —
mock inline-toteuttaa kaiken yhteen tiedostoon luettavuuden vuoksi.

## Fidelity

**High-fidelity.** Värit, typografia, välistys, border-radiukset ja
komponenttirakenne ovat lopullisia. Referenssitiedosto käyttää tarkkoja
hex-arvoja ja pikselitarkkaa välistystä. Toteuta UI pikselitarkasti
sovelluksen olemassa olevan tyylittelytavan mukaisesti.

## Käsitemalli

```
┌─────────────────────────────────────────────────────────────┐
│ BUSSIT  =  master-lista käyttäjän pysäkeistä               │
│            • lisäys (pysäkin tunnusnumerolla, esim. 1933)  │
│            • poisto                                         │
│            • järjestys (drag handle)                        │
│            • seurattavat linjat per pysäkki                 │
│            • toggle: näytetäänkö etusivulla?                │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ ETUSIVU · "Seuraavat bussit"                                │
│            = ote Bussit-listasta (vain ne joilla onHome)    │
│            = sama järjestys kuin Bussit-listassa            │
│ Muokkaa-painike → bottom sheet jossa pelkät checkboxit      │
└─────────────────────────────────────────────────────────────┘
```

Jokaiselle pysäkille talletetaan kenttä **`onHome: boolean`** (oletus
`true` uusille pysäkeille). Etusivun lista on
`stops.filter(s => s.onHome)` Bussit-näkymän järjestyksessä.

## Screens / Views

### 1. Etusivu · "Seuraavat bussit" (näkymätila)

**Purpose.** Vilkaisu seuraaviin lähtöihin käyttäjän valituista pysäkeistä.

**Layout.**
- Sijoitettu etusivun vertikaalisessa virtauksessa (sama paikka kuin
  nykyisin, aiemman handoffin V3 Today Feedin osana).
- Otsikkorivi `display: flex; justify-content: space-between; align-items: baseline`.
- Sisältökortti: `background: var(--card)` (`#111118`), `border-radius: 16px`,
  `padding: 14px`.
- Pysäkkirivit pystysuunnassa, jokainen `padding: 8px 0` ja
  `border-bottom: 1px solid var(--border)` paitsi viimeinen.

**Otsikko.**
- Teksti: "Seuraavat bussit"
- Tyyli: `font-size: 17px; font-weight: 700; color: var(--text)` (`#eaeaee`)
- Oikealla painike "Muokkaa": `background: none; border: none;
  color: var(--accent)` (`#4a9eff`), `font-size: 13px; font-weight: 600`,
  ei paddingiä. Klikkaus avaa bottom sheetin (näkymä #2).

**Pysäkkirivi.**
- Vasemmalla pysäkin nimi (`font-size: 14px; font-weight: 600;
  color: var(--text)`, ellipsoitu yhdelle riville:
  `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`).
- Nimen alla "linja1 · linja2" (`font-size: 11px; color: var(--text-muted)`
  (`#7a7a85`), `margin-top: 2px`). Näytetään pysäkin kaksi seurattua linjaa
  (jos enemmän, leikataan kahteen ensimmäiseen + voi näyttää "…" tarvittaessa).
- Oikealla samalla rivillä: kellonaika (`font-size: 11px;
  color: var(--text-muted)`) ja iso ETA-arvo
  (`font-size: 14px; font-weight: 700; color: var(--accent-green)` (`#4ade80`),
  `font-variant-numeric: tabular-nums`).

**Käytös.**
- "Muokkaa" → näkymä #2 avautuu bottom sheettinä.
- Pysäkkirivin klikkaus → vie Bussit-välilehdelle, kelataan kyseiseen
  pysäkkiin.

### 2. Etusivu · Muokkaa-bottom sheet (UUSI)

**Purpose.** Käyttäjä valitsee mitkä hänen pysäkeistään näytetään
etusivun "Seuraavat bussit" -listassa. Ei mitään muuta hallintaa.

**Layout.**
- Bottom sheet: `position: absolute; left: 0; right: 0; bottom: 0`.
- Tausta: `#15151c` (kortti-väriä hieman tummempi).
- Yläkulmat pyöristetty: `border-top-left-radius: 20px;
  border-top-right-radius: 20px`.
- Padding: `14px 18px 22px`.
- Box-shadow: `0 -8px 24px rgba(0,0,0,0.4)`.
- Etusivu jää näkyviin sheetin taustalle dimmattuna
  (`opacity: 0.3; pointer-events: none`) tai vaihtoehtoisesti läpinäkyvä
  musta backdrop `rgba(0,0,0,0.4)`. Suosi backdrop-mallia jos sovelluksessa
  on jo modal-overlay-pattern.
- Sheetin yläreunassa drag-grabber: `width: 36px; height: 4px;
  border-radius: 2px; background: #3a3a48; margin: 0 auto 14px`.

**Otsikkorivi.**
- Vasemmalla h3: "Etusivulla näytettävät" (`font-size: 17px; font-weight: 700`).
- Oikealla "Valmis" (`background: none; border: none;
  color: var(--accent-green)` (`#4ade80`), `font-size: 13px; font-weight: 600`).

**Selittävä copy.**
- "Pysäkkien järjestystä ja sisältöä hallitaan Bussit-näkymässä.
  Tästä valitset mitkä niistä näytetään etusivulla."
- Tyyli: `font-size: 12px; color: var(--text-muted)` (`#7a7a85`),
  `line-height: 1.4; margin: 0 0 14px`.

**Pysäkkilista (kaikki käyttäjän pysäkit, ei vain etusivulla olevat).**
- Jokainen pysäkki on `<label>`-elementti (jotta koko rivi on klikattava):
  `display: flex; align-items: center; gap: 12px; padding: 12px 4px;
  border-bottom: 1px solid var(--border); cursor: pointer`.
- Vasemmalla checkbox-laatikko `width: 22px; height: 22px;
  border-radius: 6px`:
  - Valittu: `background: var(--accent-green)` (`#4ade80`),
    `border: 1.5px solid var(--accent-green)`. Sisällä valkoinen check-svg
    (`stroke: #0a0a0f`, `stroke-width: 2`).
  - Ei valittu: `background: transparent; border: 1.5px solid #444`.
- Oikealla pysäkin nimi (`font-size: 14px; font-weight: 600`) ja sen alla
  "Tunnus 1933" (`font-size: 11px; color: var(--text-muted)`,
  `margin-top: 1px`).

**Alanappi.**
- Teksti: "Hallitse pysäkkejä Bussit-näkymässä →"
- Tyyli: `width: 100%; margin-top: 16px;
  background: transparent; border: 1px solid var(--accent);
  color: var(--accent); font-size: 14px; font-weight: 600;
  padding: 12px 16px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; gap: 6px`.
- Klikkaus: sheet sulkeutuu, alapalkista valitaan **Bussit**-tabi, ja
  Bussit-näkymä avautuu **muokkaustilassa** (näkymä #3).

**Käytös.**
- Checkbox-toggle muuttaa ko. pysäkin `onHome`-arvon välittömästi
  localStoragessa. Etusivun lista päivittyy taustalla heti (käyttäjä näkee
  muutokset kun sulkee sheetin).
- "Valmis" sulkee sheetin. Ei vaadi explicit save-painiketta.
- Backdrop-klikkaus tai swipe-down sulkee sheetin myös.

### 3. Bussit · Muokkaustila (olemassa oleva, pieni lisäys)

Tämä näkymä on **jo olemassa** (toteutettu aiemmassa Bussit-redesignissa).
Tässä handoffissa lisätään vain yksi elementti: vihjelaatikko otsikon alle,
kun käyttäjä saapuu tähän näkymään etusivun bottom sheetistä.

**Vihjelaatikon paikka.** Heti otsikon ("Bussit") ja tab-rivin
("Föli · Turun seutu · Muokkaustila") jälkeen, ennen pysäkkikortteja.

**Vihjelaatikon tyyli.**
- `background: rgba(74, 158, 255, 0.08)` (accentin 8% alpha).
- `border: 1px solid rgba(74, 158, 255, 0.2)`.
- `border-radius: 10px`.
- `padding: 10px 12px; margin-top: 10px; margin-bottom: 14px`.
- `font-size: 12px; color: var(--text-secondary)` (`#c4c4cc`),
  `line-height: 1.4`.
- `display: flex; align-items: flex-start; gap: 8px`.
- Vasemmalla 14×14 px info-ikoni (ympyrä + i),
  `color: var(--accent)`, `flex-shrink: 0; margin-top: 1px`.
- Teksti: *"Muutokset näkyvät myös etusivun 'Seuraavat bussit' -listassa."*

**Vihjeen näyttölogiikka.**
- Näytä vihje aina kun Bussit-näkymä on muokkaustilassa **JA** käyttäjä on
  saapunut sinne joko (a) etusivun bottom sheetin "Hallitse pysäkkejä"
  -napista tai (b) avannut muokkaustilan ensimmäistä kertaa.
- Älä näytä vihjettä toistuvasti sen jälkeen, kun käyttäjä on käynyt
  muokkaustilassa muutaman kerran (esim. piilota localStorage-flagilla
  `bussit_edit_hint_dismissed = true` 3. käyntikerran jälkeen).
- Vihje ei ole sulkupainikkeellinen — se häipyy automaattisesti.

## Interactions & Behavior

### Flow A — käyttäjä haluaa piilottaa pysäkin etusivulta

1. Etusivulla, Seuraavat bussit -otsikon vieressä → tap "Muokkaa"
2. Bottom sheet avautuu, kaikki käyttäjän pysäkit listattuna checkboxeineen
3. Käyttäjä unche­ckaa pysäkin → checkbox-väri muuttuu transparentiksi
4. Etusivun lista taustalla päivittyy heti (jos backdrop ei ole täysin
   peittävä, käyttäjä näkee muutoksen)
5. Tap "Valmis" tai backdrop → sheet sulkeutuu

### Flow B — käyttäjä haluaa lisätä uuden pysäkin etusivulle

1. Etusivulla → tap "Muokkaa"
2. Bottom sheet → tap "Hallitse pysäkkejä Bussit-näkymässä →"
3. Sheet sulkeutuu, alapalkista korostetaan Bussit-tabi (tab-vaihto-animaatio
   200ms ease-out)
4. Bussit-näkymä avautuu muokkaustilassa, vihjelaatikko näkyvissä
5. Käyttäjä syöttää tunnuksen "Lisää pysäkki" -kenttään → tap "Lisää"
6. Pysäkki lisätään listaan `onHome: true` -oletuksena → näkyy heti myös
   etusivun listassa

### Animations & transitions

- Bottom sheet enter: `transform: translateY(100%) → translateY(0)`,
  `300ms cubic-bezier(0.32, 0.72, 0, 1)`
- Bottom sheet exit: käänteinen, `250ms cubic-bezier(0.32, 0.72, 0, 1)`
- Backdrop fade: `opacity 0 → 1`, `250ms ease-out`
- Checkbox toggle: `background-color 150ms ease-out`
- Tab vaihto sheet → Bussit: sheet sulkeutuu ensin (250ms), sen jälkeen
  tab vaihtuu (kokonaiskesto ~400ms)

### State management

State joka tarvitaan:

```js
// Per stop, talletetaan localStorageen
{
  id: string,         // generated tai pysäkin tunnusnumero
  name: string,       // pysäkin nimi (haetaan Föli-rajapinnasta)
  code: string,       // pysäkin tunnusnumero (esim. "1933")
  lines: string[],    // seurattavat linjat (oletuksena kaikki)
  onHome: boolean,    // näytetäänkö etusivulla (oletus true)
  order: number,      // järjestys Bussit-listassa (drag-handle)
}

// Komponenttitason state etusivun sheetille
const [sheetOpen, setSheetOpen] = useState(false);

// Vihjeen seuranta Bussit-näkymässä
const editVisits = parseInt(localStorage.getItem('bussit_edit_visits') || '0');
const showHint = editVisits < 3;
```

State-muutokset:
- `onHome`-toggle → kirjoita localStorage välittömästi
  (`debounce 200ms` jos halutaan välttää spam-kirjoituksia)
- Etusivun "Seuraavat bussit" -lista lukee samasta localStorage-arvosta
  (suosi koodikannan olemassa olevaa storage-hookia)
- Tab-vaihto sheetistä → käytä koodikannan olemassa olevaa
  `setActiveTab('bussit')` -callia + lisäparametri
  `setEditMode(true)` jotta muokkaustila aukeaa heti.

## Design Tokens

Käytä koodikannan olemassa olevia CSS custom properties (oletettavasti
`src/index.css` tai vastaava). Tässä viite-arvot, jotka mockissa
käytetään:

```css
--bg:               #0a0a0f;
--card:             #111118;
--border:           #1a1a24;
--text:             #eaeaee;
--text-secondary:   #c4c4cc;
--text-muted:       #7a7a85;
--accent:           #4a9eff;  /* sininen, primary action */
--accent-green:     #4ade80;  /* vihreä, ETA / valittu */
```

Spacing-skaala: `4px / 6px / 8px / 10px / 12px / 14px / 16px / 18px / 22px`.
Border-radius: `6px / 8px / 10px / 12px / 16px / 20px`.

Typografia:
- Otsikot 26px / 17px / 14px, weight 700
- Body 14px weight 600 (pysäkin nimi), 12px weight 400 (kuvaukset)
- Pikkuteksti 11px (timestamps, tunnus-rivi)
- Kaikki tabular-numerot: `font-variant-numeric: tabular-nums`

## Assets

Ei uusia kuvia tai ikoneja. Käytetään inline SVG:tä:
- Checkbox-check (svg: viewBox 0 0 12 12, path "M2 6l3 3 5-6")
- Info-ikoni (ympyrä + i)
- Drag-handle (6 pistettä 2 sarakkeessa, jo olemassa Bussit-näkymässä)

## Files

```
reference/
└── solution-a-mockups.jsx    # 4 mockia: home view, edit sheet,
                                bussit edit, flow diagram
```

Avaa mockit asentamalla repo paikallisesti (tai katso ne suoraan
prototyyppi-canvasista, josta tämä handoff luotiin). Komponentit
mockissa on mitoitettu mobiili-leveydelle 360–414px.

## Open questions

- **Tyhjätila etusivulla**: Jos käyttäjä unche­ckaa kaikki pysäkit, mitä
  näytetään? Vaihtoehdot:
  1. "Seuraavat bussit" -osio katoaa kokonaan etusivulta
  2. Tyhjätila + nappi "Lisää pysäkkejä etusivulle" joka avaa saman sheetin
  Suositus: vaihtoehto **2** — pidetään osio aina näkyvissä, jotta käyttäjä
  voi nopeasti tuoda pysäkit takaisin.
- **Pysäkkien max-määrä etusivulla**: Mockissa ei rajoitettu. Suositus:
  ei kovaa rajaa, mutta jos `onHome`-pysäkkejä on yli 6, harkitse näytä
  vain 6 ensimmäistä + "Näytä kaikki" -nappi.
- **Sheetin tabin järjestys**: jos sovelluksessa käytetään natiivia HTML
  `<dialog>`-elementtiä, keskity siihen. Muuten käytä koodikannan
  olemassa olevaa modal-pattern (esim. Headless UI, Radix, oma).
