# Norair Harutyunyan — Game Art Portfolio

A curated game-art portfolio. Static HTML, CSS, and JavaScript; no build dependencies.

Live site: https://norohtn.github.io/norair-selected-works/

## Content

Twenty-six project pages, organized into 15 Slot Games and 11 Crash / Instant games. Project links point to verified official Pascal Gaming pages. Assets are reused from the original public portfolio and official game pages. The original portfolio is maintained separately.

## Publishing

Public hosting: GitHub Pages, deployed from `main` and `/(root)` in this repository. `.nojekyll` keeps all assets available.

## Local preview

Run `python -m http.server 8000` from this repository and open `http://localhost:8000/`.

Game artwork and branding belong to their respective owners.

## Presentation

Self-hosted typefaces, responsive cover artwork, game search, pointer-aware card depth, scroll reveals, keyboard galleries, and click-to-play cinematics. Motion respects the visitor’s reduced-motion preference. Ten official covers are precision-upscaled to 1200px; asset-sources.json records originals and processing.

The two cinematic files are exact copies of the original public portfolio’s mobile MP4 exports, served locally for reliable playback.

Regenerate HTML with `python tools/build_portfolio.py`. CSS and JavaScript live in `assets/`.
