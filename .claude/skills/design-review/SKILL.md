---
name: design-review
description: Arvioi UI/UX-suunnitelmat ja komponentit projektin standardien mukaisesti
---

# Turku PWA Design Review

Arvioi käyttöliittymä seuraavien kriteerien mukaan:

## 1. Dark Theme -yhtenäisyys

Tarkista että käytetään CSS-muuttujia (src/index.css):
- `--bg: #0a0a0f` - tausta
- `--card: #111118` - kortit
- `--accent: #4a9eff` - korostusväri
- `--accent-green: #4eff9f` - positiivinen
- `--accent-yellow: #ffcc00` - varoitus
- `--accent-orange: #ff9900` - huomio
- `--error: #ff4a4a` - virhe
- `--text: #ffffff` - pääteksti
- `--text-secondary: #a0a0b0` - toissijainen
- `--text-muted: #6a6a7a` - himmennetty

Ei kovakoodattuja värejä inline-tyyleissä.

## 2. Mobile-First Layout

- Max-width: 430px
- Padding: 16px
- Safe-area-tuki (notch)
- Touch-friendly: min 44px kosketusalue

## 3. Komponenttirakenne

- `.card`-luokka yhtenäiseen ulkoasuun
- `.btn-primary` ja `.btn-secondary` napeille
- `.skeleton-row` lataustiloille
- Widget-kohtaiset CSS-tiedostot

## 4. Saavutettavuus (WCAG 2.1 AA)

- Värikontrasti: vähintään 4.5:1 tekstille
- Fokus-tilat näkyvissä
- `rel="noopener noreferrer"` ulkoisille linkeille
- Alt-tekstit kuville

## 5. Responsiivisuus

- Flexbox/Grid layoutit
- Ei kiinteitä leveys-arvoja (paitsi max-width)
- Text-overflow: ellipsis pitkille teksteille

## 6. Suorituskyky

- Loading skeleton -tilat
- Error-tilat retry-napilla
- Ei turhia re-renderöintejä

## Tarkistuslista

- [ ] Käyttää vain CSS-muuttujia väreille
- [ ] Mobile-first toteutus
- [ ] Yhtenäinen spacing (8px, 12px, 16px)
- [ ] Loading/error/success -tilat
- [ ] Saavutettavuus huomioitu
- [ ] Ei duplikoitua CSS:ää
