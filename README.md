# Kericho Chess Club & Academy

A premium multi-page website for Kericho Chess Club & Academy, Kenya, rebuilt as a
futuristic, broadcast-HUD style chess platform ("Night Circuit" design system).

## Design language

"Sunrise Club": a bright, uplifting theme tuned for parents and learners. Warm cream paper,
white cards with soft shadows, jade, brass and warm-coral accents, and gentle background
animations (drifting chess pieces and soft pastel orbs on the hero, page headers and CTA bands).

- **Cinematic photo hero:** a sunlit classroom chessboard photo with a right-aligned giant
  wordmark, spaced subtitle, gradient hairline rule and coral buttons
- **Friendly cards:** rounded white cards with jade corner accents, hover lift and icon pop
- **Classic board colours:** the play and broadcast boards use cream and dusty-green vinyl
  squares, like the academy's real tournament sets
- **Typography:** Space Grotesk display headlines, readable Inter body text, JetBrains Mono
  for counters, labels and notation
- **Academy crest:** the official Kericho Chess Academy crest (pawn, king, knight, motto
  *Forward Ever Backward Never*) sits in the nav, the footer, the event poster lockup and a
  dedicated crest band on the about page; it doubles as the site favicon
- **One moody band:** only the page headers and footer go dark, for contrast
- **Mobile first-class:** dedicated breakpoints at 1100px / 900px / 600px / 420px, full-width
  tap targets, 16px form inputs (no iOS zoom), horizontally scrollable results table, stacked
  poster and footer, and a thumb-reach action dock on small screens
- Motion respects `prefers-reduced-motion` throughout

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | 3D hero + HUD overlays, notation ticker, programmes, stats counters, testimonials, FAQ |
| `coaching.html` | The three coaching tracks, four-phase method timeline, fees & FAQ |
| `tournaments.html` | **Event advert (poster band)** with live countdowns and response buttons, at-a-glance schedule, categories, M-Pesa entry steps, registration form, honour roll |
| `live.html` | **Broadcast room:** simulated live Board 1 with clocks, eval bar, move list, spectator feed and viewer telemetry |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo) + Lichess daily puzzle |
| `shop.html` | Materials & kits with one-tap WhatsApp ordering + Complete Club Kit quote banner |
| `about.html` | Academy story, values and season gallery using the local photography |
| `contact.html` | Membership form, WhatsApp coaching-enquiry composer, contact cards and **direct lines for the office bearers** |

All pages share `css/style.css` (design system) and `js/main.js` (nav, reveals, counters,
countdowns, FAQ, hero board, form handling). The chess engine lives in `js/chess.js`
(chess.js by Jeff Hlywa, BSD license) and powers `js/play.js` and `js/live.js`.

## Forms

Registration/membership forms POST to a Google Apps Script endpoint; paste your deployed
Web App URL into `SHEETS_ENDPOINT` in `js/main.js`. Until then, forms gracefully fall back to a
**WhatsApp confirmation button** pre-filled with the entrant's details (Nothing is lost, no
backend required). Payments reference M-Pesa Paybill **880100**.

## Event advert (poster band)

`index.html` and `tournaments.html` carry a poster-style advert for the next fixture
(`#event`). It reuses the site's own event card, so the **single place to edit an event** is:

1. the `#event` block in `tournaments.html` (the full poster) and the `compact` copy in `index.html`;
2. the two `data-countdown` targets in each block: first round and entries-close time;
3. the M-Pesa line in the poster footer, if the entry reference changes.

The poster artwork is `assets/tournament-prep-01.jpg` — swap that `src` (both blocks) to drop in
a different photo or a designed event poster. Visitors can respond from the advert itself:
registration form, WhatsApp entry, a Google Calendar "add to event" link, phone calls to the
Secretary/Treasurer, or email.

## Contacts shown on the site

| Who | Role | Number / email |
| --- | --- | --- |
| Shem Meso | Head Coach & Founder | 0729 037 585 · shemeso26@gmail.com |
| Gladys Langat | Secretary | 0723 397 573 (**new line**, flagged on the site) · WhatsApp |
| Julieann Njambi | Treasurer | 0722 709 727 · WhatsApp |
| Academy office | General & schools | kerichochessacademy@gmail.com |

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

1. Push this folder to a GitHub repository.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Save. GitHub will publish the site at the Pages URL shown there.

## Content notes

- The coach's name is spelled **Shem Meso** (single "s" in both names) across every page.
- **Logo:** `assets/Kericho Chess Academy logo.jpg` is the supplied source artwork. The site uses
  derived files: `assets/logo.png` (black ink, transparent — light backgrounds), `assets/logo-light.png`
  (white knockout — the dark footer) and `assets/favicon.png` (touch icon + favicon). Regenerate them
  with sharp if the source crest changes.
- **Secretary gallery:** the five photos in `assets/pics for Gladys Langat secretary.zip` were
  cropped and compressed to `gladys-langat-portrait.jpg`, `gladys-avatar.jpg`,
  `gladys-samarkand-olympiad.jpg`, `gladys-samarkand-hall.jpg`, `gladys-registan.jpg` and
  `gladys-uzbekistan.jpg`. They show Gladys Langat at the 46th FIDE Chess Olympiad in
  Samarkand, Uzbekistan, and are used on the contact page (`#team` card and the `#secretary` gallery).
- WhatsApp and phone links use `+254 729 037 585` for the coach, plus the Secretary and Treasurer lines above.
- On phones a floating action dock (`.mobile-dock`) offers the page's main action plus WhatsApp; it is shown below 600px only.
- Product prices are carried over from the previous site and should be confirmed before launch.
- Season metrics (schools, learners, tournaments) are marketing figures; adjust to taste.
- The live broadcast room replays a scripted demo game between fixtures; wire in a real feed
  when streaming hardware/accounts are ready.
- The site does not collect or store form submissions unless the Apps Script endpoint is set;
  otherwise it prepares a WhatsApp message for the visitor to review and send.
- The site displays the **original photos from the previous build**: `assets/orig-01.jpg` up to `orig-05.jpg`
  (coach-with-learner plus the four gallery shots) were extracted from the old page; the hero and three
  product photos are hotlinked from Unsplash exactly as the original site served them.
- `assets/hero-chess-academy.jpg`, `coaching-session.jpg`, `tournament-focus.jpg`, `chess-materials.jpg`
  are spare editorial images, currently unreferenced.

## Files

```text
.
├── index.html        coaching.html    tournaments.html   live.html
├── play.html         shop.html        about.html         contact.html
├── css/
│   └── style.css
├── js/
│   ├── main.js       chess.js         play.js            live.js
├── README.md
└── assets/
    ├── Kericho Chess Academy logo.jpg     # supplied crest source artwork
    ├── logo.png / logo-light.png          # crest cut-outs (light + dark backgrounds)
    ├── favicon.png                        # touch icon + favicon
    ├── gladys-*.jpg                       # Secretary photos (card + Samarkand gallery)
    ├── pics for Gladys Langat secretary.zip  # original upload, kept for reference
    ├── orig-01.jpg … orig-05.jpg          # original site photos (displayed)
    ├── hero-morning.jpg                   # sunlit classroom hero photo (displayed)
    ├── hero-dark-board.jpg                # dark board hero variant (spare)
    ├── hero-chess-academy.jpg             # spare editorial images
    ├── coaching-session.jpg
    ├── tournament-focus.jpg
    └── chess-materials.jpg
```
