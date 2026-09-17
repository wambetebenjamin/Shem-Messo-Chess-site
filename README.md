# Kericho Chess Club & Academy

A multi-page website for Kericho Chess Club & Academy, Kenya — academy content carried
onto the **Kiddos** template structure (Bootstrap 4, Colorlib, CC BY 3.0), restyled with
the club palette.

## Structure

The site now follows the uploaded **Kiddos** (Colorlib) template: a shared top bar,
ftco navbar, owl-carousel hero slider, service strips, course/staff cards, counters,
testimony carousel, gallery strip and the four-column ftco footer on every page.

- **Theme layer:** `css/kiddos.css` (the template's stylesheet) drives layout and components.
- **Club layer:** `css/chess.css` restyles it with the academy palette and adds the
  chess-specific components: broadcast stage, countdown cards, ticker, FAQ accordion,
  registration forms, honour-roll table, steps strip, product shelf and the nav "Enrol" pill.
- **Template runtime:** `js/kiddos-main.js` (nav, sliders, counters, reveals, loader) on the
  jQuery/Bootstrap/owl/aos/waypoints stack shipped in `js/`.
- **Academy runtime:** `js/smc.js` (countdowns, FAQ accordion, registration / membership /
  subscribe and WhatsApp-composer forms).
- The chess engine lives in `js/chess.js` (chess.js by Jeff Hlywa, BSD license) and powers
  `js/play.js` (playable board) and `js/live.js` (broadcast room); `js/board3d.js` renders
  the 3D board stage.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Photo hero slider, service strip, welcome + offerings, the coach & the platform, programmes, season counters, testimonials, enquiry form, club shelf, academy updates, gallery |
| `coaching.html` | The three coaching tracks, four-phase method, fees & FAQ |
| `tournaments.html` | Next fixture with live countdown, eight age categories, M-Pesa entry steps, registration form, honour roll |
| `live.html` | **Broadcast room:** live-style Board 1 with clocks, eval bar, move list, spectator feed — plus the broadcast card |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo) + the daily puzzle |
| `shop.html` | Materials & kits with one-tap WhatsApp ordering + Complete Club Kit quote banner |
| `about.html` | Academy story, the people & squads, values and the season gallery |
| `contact.html` | Membership form, WhatsApp coaching-enquiry composer, FAQ and contact cards |

All eight pages share the Kiddos navbar (with the **Enrol Now** pill) and the four-column
template footer.

## Photos

The site displays the academy's own photography throughout: `assets/orig-01.jpg` …
`orig-05.jpg`, `assets/tournament-prep-01.jpg` … `tournament-prep-10.jpg` and the hero,
coaching, tournament and materials shots in `assets/`. Kiddos stock imagery is not used.

## Forms

Registration/membership forms POST to a Google Apps Script endpoint; paste your deployed
Web App URL into `SHEETS_ENDPOINT` in `js/smc.js`. Until then, forms gracefully fall back
to a **WhatsApp confirmation button** pre-filled with the entrant's details (nothing is
lost, no backend required). Payments reference M-Pesa Paybill **880100**.

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
- Season metrics (schools, learners, tournaments, coached hours) are marketing figures; adjust to taste.
- The live broadcast room replays a scripted demo game between fixtures; wire in a real feed
  when streaming hardware/accounts are ready.
- The site does not collect or store form submissions unless the Apps Script endpoint is set;
  otherwise it prepares a WhatsApp message for the visitor to review and send.

## Files

```text
.
├── index.html        coaching.html    tournaments.html   live.html
├── play.html         shop.html        about.html         contact.html
├── css/
│   ├── kiddos.css    (template theme)      chess.css     (club restyle + chess components)
│   └── animate.css · aos.css · owl carousel · magnific-popup · icon fonts css
├── js/
│   ├── jquery · bootstrap · owl · aos · waypoints · stellar · scrollax (template stack)
│   ├── kiddos-main.js (template runtime)   smc.js        (academy runtime)
│   └── chess.js · play.js · live.js · board3d.js         (the chess core)
├── fonts/   (flaticon · icomoon · ionicons · open-iconic)
├── assets/  (academy photography — original pictures from the previous build)
└── kiddos-master.zip   (uploaded source template, for reference)
```

Template: **Kiddos** by [Colorlib](https://colorlib.com) (CC BY 3.0) — the attribution line
is kept in the footer of every page.
