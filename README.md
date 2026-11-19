# iZone — Only Apple Products

Static, single-page website for the iZone boutique. Strict black & white identity, no build step: open `index.html` in a browser, or serve the folder with any static host (e.g. GitHub Pages).

## Structure

```
index.html              page content (products, services, boutique)
assets/css/styles.css   all styling — brand colours are tokens at the top
assets/js/main.js       mobile menu toggle + footer year only
assets/img/             logo (white on transparent), shop photo, icons, social image
```

## Brand rules

| Token           | Value     | Use                                  |
| --------------- | --------- | ------------------------------------ |
| `--black`       | `#000000` | background                           |
| `--white`       | `#FFFFFF` | main text, primary button border     |
| `--grey`        | `#B3B3B3` | secondary text                       |
| `--line`        | `#262626` | card borders, dividers               |
| `--line-strong` | `#4D4D4D` | secondary button borders, hover      |

- The iZone logo is the main visual; the slogan "ONLY APPLE PRODUCTS" sits in white beneath it.
- The shop photograph is always displayed smaller than the hero logo.
- Buttons are black with white text and a thin white or grey border.
- No colourful gradients, decorations or excessive animation.
