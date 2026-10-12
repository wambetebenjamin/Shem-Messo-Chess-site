# Kericho Chess Club & Academy

A static, multi-page chess site for the Academy in Kericho, Kenya. The home page is organized around a simple visitor path — **play, learn, compete** — and takes visual cues from the supplied chess-site reference: a charcoal-and-gold palette, a framed chess hero, feature cards and tournament updates. The recently added `eventre-master.zip` directly informs the event-led structure: a fixture-first hero, schedule-style agenda rows, a coach spotlight inspired by its speaker section, event gallery and clear registration actions. The archive layout is adapted for chess and its stock photos are not used; no child photos are referenced by active pages.

## Pages

| Page | Purpose |
| --- | --- |
| `index.html` | Main landing page: online play, coaching, local fixtures, Academy approach, coach spotlight and contact actions |
| `play.html` | Full-rules pass-and-play chess and daily puzzle |
| `tournaments.html` | Fixture information, category list, register-interest form and results table |
| `coaching.html` | Coaching tracks, four-phase method, fees and FAQ |
| `live.html` | Broadcast room with clocks, move list, evaluation and replay |
| `shop.html` | Chess equipment and club materials, ordered through WhatsApp |
| `about.html` | Academy story, crest, office bearers, partner schools and club values |
| `contact.html` | Direct contacts, membership form, coaching enquiry and office-bearer portraits |

The shared navigation uses readable labels: Play Online, Tournaments, Lessons, Live, Shop, About and Join Academy. The pages retain their existing chess, registration, contact and WhatsApp features, with the dark/gold theme layered over the original Bootstrap/Kiddos layout.

## Images

The active website uses the uploaded Academy crest, adult office-bearer portraits, chess equipment, empty tournament spaces and board imagery. **No child photographs are referenced by the active page markup.** Historical originals and source ZIPs remain in the repository as supplied; they are not used as active page imagery.

- Local chess visuals: `assets/hero-dark-board.jpg`, `assets/hero-morning.jpg`, `assets/chess-materials.jpg`, `assets/tournament-prep-01.jpg` … `tournament-prep-10.jpg`, and the product shelf photos.
- Uploaded product photos from `merchandise.zip` are in `assets/products/rubber-chess-mat.jpg` and `assets/products/vinyl-chess-mats.jpg`.
- Treasurer Julieann Njambi's uploaded adult portrait is cropped to `assets/leadership/treasurer-julieann-njambi.jpg`; the supplied original remains in the repository root.
- The small monochrome chessboard stock photo is from Pexels photo 5789688, served locally as `assets/stock-pexels-chessboard-5789688.jpg`. Source: [Pexels chess-board search](https://www.pexels.com/search/chess%20board/). Pexels licence: [pexels.com/license](https://www.pexels.com/license/).
- Local PNG pieces in `assets/pieces/` power the 2D Play and Live boards.

## Theme and runtime

- `css/academy-theme.css` supplies the shared dark-charcoal / warm-gold theme and bespoke homepage layout.
- `css/kiddos.css` and `css/chess.css` retain the responsive Bootstrap grid and chess-specific UI components for inner pages.
- `js/kiddos-main.js` handles the template runtime; `js/smc.js` handles countdowns, FAQ accordions, forms and WhatsApp fallbacks.
- `js/chess.js`, `js/play.js`, `js/live.js` and `js/board3d.js` provide the chess engine, playable board, broadcast replay and optional 3D board.

## Fixtures and forms

The old September 2026 fixture date has passed. Tournament pages now show the next fixture as **date to be announced** and invite visitors to register interest or ask for an update. The tournament form does not request payment until the Academy confirms an event and entry fee.

Membership and tournament forms POST to a Google Apps Script endpoint when configured. Set `SHEETS_ENDPOINT` in `js/smc.js` to the deployed URL. Until that is configured, each form offers a WhatsApp message for the visitor to review and send; the site does not store submissions itself. M-Pesa Paybill **880100** is shown for confirmed membership/material payments; confirm tournament payment instructions with the Academy after a date is announced.

## Contact details shown on the site

| Who | Role | Contact |
| --- | --- | --- |
| Shem Meso | President & Head Coach | +254 729 037 585 · shemeso26@gmail.com |
| Barnabas Ochieng | Vice Chairperson | Contact via kerichochessacademy@gmail.com |
| Gladys Langat | Secretary | +254 723 397 573 |
| Julieann Njambi | Treasurer | +254 722 709 727 |
| Academy office | General & schools | kerichochessacademy@gmail.com |

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select the desired branch and `/ (root)`, then save.
4. Use the Pages URL shown in the settings.
