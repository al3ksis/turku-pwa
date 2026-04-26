# Turku PWA — sovellusikoni "Turku / Åbo"

Tämä paketti korvaa nykyisen sovellusikonin sovelluksen oman
TURKU/ÅBO-wordmarkin pinotulla versiolla.

## Tiedostot

| Tiedosto                    | Käyttö                                                 | Sijoitus repossa                |
|-----------------------------|--------------------------------------------------------|---------------------------------|
| `icon.svg`                  | Vektori-master, full-bleed (iOS / korkearesoluutiotaso) | `public/icon.svg` (uusi)        |
| `icon-maskable.svg`         | Vektori-master, sisältö 66% safe zonella (Android)     | `public/icon-maskable.svg` (uusi) |
| `icon-192.png`              | PWA standardikoko                                      | `public/icon-192.png` (korvaa)   |
| `icon-512.png`              | PWA iso koko                                           | `public/icon-512.png` (korvaa)   |
| `icon-1024.png`             | App Store / Play Store taso (jos tarvitset jatkossa)   | `public/icon-1024.png` (uusi)   |
| `icon-maskable-512.png`     | Android adaptive icon, sisältö safe zonella           | `public/icon-maskable-512.png` (korvaa) |
| `apple-touch-icon.png`      | iOS "Add to Home Screen" 180×180                      | `public/apple-touch-icon.png` (uusi/korvaa) |
| `favicon.svg`               | Selaimen välilehti — yksinkertaistettu "T·Å"           | `public/favicon.svg` (korvaa)    |
| `favicon-32.png`            | PNG-fallback selaimille jotka eivät tue SVG-faviconia | `public/favicon-32.png` (uusi)   |
| `manifest.json`             | Päivitetty — ei muutoksia rakenteessa                 | `public/manifest.json` (korvaa)  |

## Suunnitteluyksityiskohdat

- **Tausta:** `#0a0a0f` — sama kuin sovelluksen tumma teema, joten ikoni jatkuu sovelluksen aukaistessa
- **TURKU:** valkoinen (`#ffffff`), DM Sans 800, 220 px @ 1024, letter-spacing 6 px
- **ÅBO:** sininen (`#4a9eff`), DM Sans 700, 150 px @ 1024, letter-spacing 20 px
- **Maskable-versio:** koko sisältö skaalattu 66%:iin keskelle, jotta Androidin pyöreä/squircle-maski ei leikkaa typografiaa

## Asennus

Korvaa `turku-sovellus/public/` -kansiossa olevat tiedostot tämän paketin tiedostoilla.
Manifestiin ei tarvita muutoksia (sama rakenne) — tiedostot vain tuoreutuvat.

`apple-touch-icon.png` ja `favicon-32.png` tarvitsevat lisäksi `<link>`-tagit
`index.html`-tiedostoon. Ks. Claude Code -prompti.
