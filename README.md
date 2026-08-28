# Shem Messo Chess Academy

A premium multi-page website for Shem Messo Chess Academy in Kericho, Kenya, rebuilt as a
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
- **One moody band:** only the page headers and footer go dark, for contrast
- Motion respects `prefers-reduced-motion` throughout

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | 3D hero + HUD overlays, notation ticker, programmes, stats counters, testimonials, FAQ |
| `coaching.html` | The three coaching tracks, four-phase method timeline, fees & FAQ |
| `tournaments.html` | Next fixture with live countdowns, categories, M-Pesa entry steps, registration form, honour roll |
| `live.html` | **Broadcast room:** simulated live Board 1 with clocks, eval bar, move list, spectator feed and viewer telemetry |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo) + Lichess daily puzzle |
| `shop.html` | Materials & kits with one-tap WhatsApp ordering + Complete Club Kit quote banner |
| `about.html` | Academy story, values and season gallery using the local photography |
| `contact.html` | Membership form, WhatsApp coaching-enquiry composer and contact cards |

All pages share `css/style.css` (design system) and `js/main.js` (nav, reveals, counters,
countdowns, FAQ, hero board, form handling). The chess engine lives in `js/chess.js`
(chess.js by Jeff Hlywa, BSD license) and powers `js/play.js` and `js/live.js`.

## Forms

Registration/membership forms POST to a Google Apps Script endpoint; paste your deployed
Web App URL into `SHEETS_ENDPOINT` in `js/main.js`. Until then, forms gracefully fall back to a
**WhatsApp confirmation button** pre-filled with the entrant's details (Nothing is lost, no
backend required). Payments reference M-Pesa Paybill **880100**.

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

- WhatsApp and phone links use `+254 729 037 585`.
- Product prices are carried over from the previous site and should be confirmed before launch.
- Season metrics (schools, learners, tournaments) are marketing figures; adjust to taste.
- The live broadcast room replays a scripted demo game between fixtures; wire in a real feed
  when streaming hardware/accounts are ready.
- The site does not collect or store form submissions unless the Apps Script endpoint is set;
  otherwise it prepares a WhatsApp message for the visitor to review and send.
- The site displays **only the academy's own photographs**: `assets/orig-01.jpg` up to `orig-05.jpg`,
  taken from the previous build. No stock, generated or third-party imagery is used anywhere on the
  site, and those five files are the only images in `assets/`.

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
    ├── orig-01.jpg                        # coach with one learner
    ├── orig-02.jpg                        # tournament hall mid-round
    ├── orig-03.jpg                        # learners in uniform between rounds
    ├── orig-04.jpg                        # learners celebrating a win
    └── orig-05.jpg                        # learners together at a competition
```
