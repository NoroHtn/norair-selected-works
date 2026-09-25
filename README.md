# Norair Harutyunyan — Game Art Portfolio

A curated game-art portfolio. Static HTML, CSS, and JavaScript; no build dependencies.

Live site: https://norair-selected-works.cocoa-ball-5078.chatgpt.site

## Content

Twenty-six project pages, organized into 15 Slot Games and 11 Crash / Instant games. Project links point to verified official Pascal Gaming pages. Assets are reused from the original public portfolio and official game pages. The original portfolio is maintained separately.

## Publishing

Public hosting: Sites. This repository retains the GitHub Pages-ready source. `.nojekyll` keeps all assets available.

## Local preview

Run `python -m http.server 8000` from the parent folder and open `/norair-selected-works/`.

Game artwork and branding belong to their respective owners.

## Presentation

Self-hosted typefaces, responsive cover artwork, game search, pointer-aware card depth, scroll reveals, keyboard galleries, and click-to-play cinematics. Motion respects the visitor’s reduced-motion preference. Ten official covers are precision-upscaled to 1200px; asset-sources.json records originals and processing.

The two cinematic files are exact copies of the original public portfolio’s mobile MP4 exports, served locally for reliable playback.

Regenerate HTML with `python tools/build_portfolio.py`. CSS and JavaScript live in `assets/`.
