# Claude Code -prompti

Kopioi tämä alle Claude Codelle:

---

Päivitä Turku PWA:n sovellusikoni uuteen "Turku / Åbo" -wordmark-versioon.
Ikonipaketti on kansiossa `icon-package/` projektin juuressa (tai siellä mihin pakkasit sen).

## Tehtävät

1. **Korvaa nämä tiedostot** `turku-sovellus/public/`-kansiossa paketista:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-512.png`
   - `favicon.svg`
   - `manifest.json`

2. **Lisää nämä uudet tiedostot** samaan kansioon:
   - `icon.svg`            (vektori-master)
   - `icon-maskable.svg`   (vektori-master, maskable)
   - `icon-1024.png`       (App Store -kokoinen)
   - `apple-touch-icon.png` (iOS Add to Home Screen)
   - `favicon-32.png`      (PNG-fallback faviconille)

3. **Päivitä `turku-sovellus/index.html`** (tai vastaava root-HTML)
   varmistamalla että head-osiossa ovat nämä rivit:

   ```html
   <!-- iOS Add to Home Screen -->
   <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />

   <!-- Selaimen välilehti -->
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />

   <!-- PWA manifest -->
   <link rel="manifest" href="/manifest.json" />
   ```

   Jos vastaavat `<link>`-tagit ovat jo olemassa eri poluilla, päivitä polut yllä mainittuihin.

4. **Service worker (sw.js)** — jos service worker välimuistittaa nämä tiedostot
   nimettyinä, bumppaa cache-versio (esim. `turku-cache-v2` → `turku-cache-v3`)
   jotta vanhat ikonit poistuvat käyttäjien laitteilta.

5. **Verifioi**:
   - Avaa `/manifest.json` selaimessa: kaikki kolme `icons` URL:ää latautuvat (200).
   - Aja `npm run build` (tai vastaava) — varmista että uudet PNG:t kopioituvat `dist/`-kansioon.
   - DevToolsin "Application" → "Manifest" -välilehdellä esikatselun pitäisi näyttää uusi ikoni.

## Tausta

Käyttäjä valitsi "Turku / Åbo (pinottu)" -suunnan ikonisuunnittelusessiosta.
Ikoni heijastaa sovelluksen olemassaolevaa header-wordmarkia: TURKU valkoisena,
ÅBO sinisenä alla, samalla taustavärillä kuin sovelluksen tumma teema (`#0a0a0f`).
