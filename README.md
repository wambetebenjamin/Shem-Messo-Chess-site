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
- **Events layer:** `css/events.css` carries the events listing cards, the event detail page
  (fact strip, entry-fee table, prose blocks, sticky side rail) and the stepped form shell
  shared by `register.html` and `consent.html`. Linked on those four pages plus `play.html`,
  which reuses the same `.f` / `.f-grid` field shell for the coach-booking form.
- **Academy crest:** the official Kericho Chess Academy crest (pawn, king, knight, motto
  *Forward Ever Backward Never*) sits in the nav, the footer, the event poster lockup and a
  dedicated crest band on the about page; it doubles as the site favicon
  (`assets/logo.png`, `assets/logo-light.png`, `assets/favicon.png`).
- **Template runtime:** `js/kiddos-main.js` (nav, sliders, counters, reveals, loader) on the
  jQuery/Bootstrap/owl/aos/waypoints stack shipped in `js/`.
- **Academy runtime:** `js/smc.js` (countdowns, FAQ accordion, registration / membership /
  subscribe and WhatsApp-composer forms).
- The chess engine lives in `js/chess.js` (chess.js by Jeff Hlywa, BSD license) and powers
  `js/play.js` (playable board), `js/live.js` (broadcast room) and the computer opponent
  (`js/engine.js`); `js/board3d.js` renders the 3D board stage.
- **Live multiplayer:** `js/online.js` is the browser side and `server/server.js` the room
  server — a dependency-free Node process that serves the site and the `/ws` game channel.
  Nothing is required for pass-and-play or the computer, so the rest of the site stays static.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Photo hero slider, service strip, welcome + offerings, the coach & the platform, programmes, season counters, testimonials, enquiry form, club shelf, academy updates, gallery |
| `coaching.html` | The three coaching tracks, four-phase method, fees & FAQ |
| `tournaments.html` | **Event advert (poster band)** with live countdowns and response buttons, next fixture with live countdown, eight age categories, M-Pesa entry steps, registration form, honour roll |
| `events.html` | **Upcoming Events listing** — a poster card per fixture (image, title, date, venue, entries-close, entry fee, Register), how-entry-works steps, past-results table |
| `event.html` | **Event detail** — poster + intro, six-cell fact strip, registration form, entry-fee table (CKF member / NON-CKF member), deadline + date-of-event, poster, long-form description, sticky side rail with two countdowns |
| `register.html` | **Membership registration** — 4-step wizard (details → verify email → category & payment → review & submit) ending in a confirmation with a membership reference |
| `consent.html` | **Photo & video consent** — 3-step wizard (player & guardian → permissions → sign & submit) ending in a consent reference and withdrawal instructions |
| `live.html` | **Broadcast room:** live-style Board 1 with clocks, eval bar, move list, spectator feed — plus the broadcast card |
| `play.html` | **Playable board:** three ways to play — live online against a friend, pass-and-play on one device, or against the computer (easy / medium / hard) — plus the **coach-booking form** and the daily puzzle |
| `shop.html` | Materials & kits with one-tap WhatsApp ordering + Complete Club Kit quote banner |
| `about.html` | Academy story, **crest band with the academy motto**, **the office bearers with portraits**, the partner schools, the squads, values and the season gallery |
| `contact.html` | Membership form, WhatsApp coaching-enquiry composer, FAQ, contact cards, **direct lines for the office bearers (portrait cards)** and the **Secretary's Samarkand Olympiad gallery** |

All twelve pages share the Kiddos navbar — now with an **Events** item (`fas fa-calendar-days`)
beside Tournaments, and the **Enrol Now** pill pointed at `register.html` — and the template
footer, which carries phone/WhatsApp/email contacts and an **Office Bearers** column
(President & Head Coach, Vice Chairperson, Secretary, Treasurer — Gladys's new line is
flagged; the Vice Chairperson routes through the academy office).

### The leadership cards (contact.html#team)

Four portrait cards in club order, each with its real contact actions, plus the general
Academy Office line in a band underneath:

| Card | Role | Photo | Contact actions |
| --- | --- | --- | --- |
| Shem Meso | President & Head Coach | `assets/leadership/president-shem-meso.jpg` (600×900) | WhatsApp · 0729 037 585 · shemeso26@gmail.com |
| Barnabas Ochieng | Vice Chairperson | `assets/leadership/vice-chairperson-barnabas-ochieng.jpg` (600×900) | Routed through the academy office (no published personal line yet) |
| Gladys Langat | Secretary | `assets/gladys-avatar.jpg` + **NEW LINE** badge | 0723 397 573 · WhatsApp |
| Julieann Njambi | Treasurer | initials avatar (portrait pending) | 0722 709 727 · WhatsApp |
| Academy Office (band) | General & schools | crest-coloured initials | kerichochessacademy@gmail.com · 0729 037 585 |

The Treasurer's card is kept on `contact.html#team` only, per the club's decision. A
`PORTRAIT SLOT` comment marks the exact spot inside her card where a portrait goes when
one arrives (the same comment marks the fourth card in the about-page grid).

Shem's "The Coach & The Platform" section on `index.html` is retitled **The President & The
Platform**, and his card there reads **President & Head Coach**, so the two sections agree. His title reads **President & Head Coach** in every card,
heading, footer entry and alt text on the site.

## Playing on the site

`play.html` offers three ways to play on one board, plus a way to book time with the coach.
Pick one from the tile row above the board.

| Mode | What it is | Needs |
| --- | --- | --- |
| **Pass & play** | Two players share one device and take turns on the same board. Full rules: check, checkmate, castling, en passant, promotion and undo. | nothing |
| **Play a friend** | Two players on **separate devices**, in real time. Create a game to get a five-character code, share it however you like, and the other player types it in. Moves, chat, resignation and rematch all sync instantly. A third or later visitor to the same code joins as a **spectator** and watches without moving. | `node server/server.js` |
| **Play the computer** | One player against a built-in engine at **easy**, **medium** or **hard**. Choose your side (white, black or random); the engine thinks in a Web Worker so the board keeps animating, and falls back to the main thread if workers are unavailable. | nothing |

The fourth tile, **Book with the coach**, scrolls to a booking form — name, phone, preferred
date, time of day, session type and what to work on — that opens WhatsApp with the request
already filled in.

### The live-play server

Two browsers cannot talk straight to each other, so *Play a friend* needs a small always-on
process. It is deliberately boring:

```bash
node server/server.js                    # site + /ws game channel on port 8080
PORT=3000 node server/server.js          # or wherever you want it
```

- **Zero dependencies.** Plain Node `http` plus a hand-rolled WebSocket implementation, so
  there is nothing to install and no supply chain to audit.
- It serves every static file in the repository, so it is a drop-in replacement for
  `python3 -m http.server`.
- The server is **authoritative**: it holds the real `Chess` game, assigns White and Black,
  and rejects illegal or out-of-turn moves. A browser cannot cheat by sending a move the
  server disagrees with.
- Rooms are five-character codes, expire after six hours of inactivity, and are swept by a
  timer; heartbeats drop dead sockets and free the seat.
- Clients reconnect with exponential backoff and rejoin their room automatically, so a
  phone sleeping or switching networks does not end the game.

**Hosting note.** Everything except *Play a friend* is plain static files and works on
GitHub Pages or Vercel exactly as before. For live multiplayer, run `server/server.js` on
any Node host (Render, Railway, Fly.io, a small VPS) and point the play page at it:

```html
<script>window.SMC_ONLINE_URL = 'wss://your-host.example/ws';</script>
<script src="js/online.js"></script>
```

With no server reachable the page says so plainly and suggests pass-and-play — it never
leaves a dead board on screen.

## Events & programmes

The way events are listed and opened follows the federation's own pattern
([chesskenya.co.ke/Events/upcoming](https://chesskenya.co.ke/Events/upcoming) and
[chesskenya.co.ke/Event/51](https://chesskenya.co.ke/Event/51)):

- **Listing (`events.html`)** — one card per event: poster image, title, **Date**, **Venue**,
  format, entries-close and a **Register** button. Nothing else competes with the card.
- **Detail (`event.html`)** — in the same order the federation uses: **Registration Form**,
  then **Entry fees** (a `# · Payment Category · CKF Member (KES) · NON-CKF Member (KES)`
  table), then **Registration Deadline** and **Date of Event**, then the poster image, then
  the long-form description sections. A sticky side rail carries the countdowns.

`event.html` currently holds **one sample event** (Kericho County Open Chess Championship
2026). Everything about it is marked with a `SAMPLE EVENT` comment at the top of the page —
the title, poster, six fact cells, two `data-countdown` targets, the five fee rows, the
deadline lines and the description paragraphs. Replace those values and the page is real.

To add a second event, copy the `<article class="ev-card">` block in `events.html` — the
`ADD THE NEXT EVENT` comment above it lists the five things to change.

## Forms

Four forms. Three of them post to the same Google Apps Script endpoint; until it is filled in
they fall back to a pre-filled **WhatsApp** message so no entry is ever lost (nothing is
stored on the site itself). The fourth — coach booking — is WhatsApp-only by design.

| Form | Where | Shape |
| --- | --- | --- |
| Event entry | `event.html` | Single-page form (name, DOB, gender, section, FIDE ID, school, CKF membership) over the M-Pesa paybill box |
| **Membership registration** | `register.html` | **4-step wizard**: your details → verify your email → membership category & payment → review & submit. Ends on a confirmation carrying a `KCA-2026-XXXX` reference |
| **Photo & video consent** | `consent.html` | **3-step wizard**: the player & you → permissions → sign & submit. Ends on a confirmation carrying a `CON-2026-XXXX` reference |
| **Coach booking** | `play.html` | One-page form (name, phone, preferred date, time of day, session type, focus) that opens WhatsApp with the whole request filled in |

The two wizards share one runtime, `js/forms.js`:

- Each step is a `<section class="wz-panel" data-step="N">`; the rail on the left marks where
  you are, and a **Step N of M** counter sits in the footer of the pane.
- Validation runs on the panel you are leaving. Offending fields turn red, radio groups raise
  an inline error, and the page scrolls to the first problem instead of failing silently.
- **Email verification** (step 2 of `register.html`) is wired but dormant: while
  `SHEETS_ENDPOINT` is unset the panel says so plainly and offers **Skip for now**. Set the
  endpoint and the same UI sends a real code.
- The consent form captures **internal use** and **publicity** as separate opt-ins plus a
  naming choice (first name only / full name / no names), mirroring the printed form. A typed
  name counts as the signature and previews as a signature block.
- No `localStorage`, no cookies. Form state lives in the page only — which matters most on
  the consent form, so a child's details are never left on a shared device.
- Both pages ship a `<noscript>` panel pointing at WhatsApp, phone and email.

## Photos

**No photographs of learners.** Every picture that showed academy children — the
`assets/orig-0*.jpg`, `assets/tournament-prep-*.jpg`, `assets/coaching-session.jpg`,
`assets/tournament-focus.jpg`, `assets/hero-chess-academy.jpg` and
`assets/hero-morning.jpg` set — has been deleted from the repository and replaced with
freely-licensed stock photography of adult players in `assets/photos/`.

| Slot | File |
| --- | --- |
| Event poster (listing card, detail page, footers) | `assets/event-poster.jpg` |
| Cards, gallery tiles, schedule thumbs | `assets/photos/*.jpg` |
| Page heroes, parallax bands, counters | `assets/hero-dark-board.jpg` (the academy's own board shot) |

Full-bleed slots deliberately reuse `assets/hero-dark-board.jpg`: free stock only exists at
≈500 px and blurs badly across a 1 920 px hero, whereas this one is the academy's own
1 376×768 photograph and carries no faces at all.

### Licensing

The `assets/photos/` set comes from **Pexels** under the
[Pexels License](https://www.pexels.com/license/) — free for commercial use, no watermark, no
attribution required. They are placeholders: **drop your own photographs straight into
`assets/photos/` (keeping the filenames) or overwrite `assets/event-poster.jpg`** and the
site picks them up with no code changes.

> Heads-up worth acting on: the photos were placed by search, not by eye, so the *subjects*
> have not been visually confirmed. Swap in the academy's own photography — or the images you
> upload to the repository — before you go live.

Still in `assets/` and untouched: the crest (`logo.png`, `logo-light.png`, `favicon.png`),
the Secretary's Samarkand 2026 photographs (`gladys-*.jpg`), the board portraits in
`assets/leadership/`, the product shots (`shelf-*.jpg`, `chess-materials.jpg`) and the chess
piece PNGs in `assets/pieces/`.

- **Club shelf product shots:** `assets/shelf-workbook.jpg`, `shelf-clock.jpg` and
  `shelf-kit.jpg` illustrate the workbook, digital clock and club kit cards;
  the set card uses the academy's own `chess-materials.jpg` photo.
- **Board piece art:** the 2D boards on Live and Play render local PNG pieces
  (`assets/pieces/`), so pieces show on every device without relying on system
  chess-glyph fonts.
- **Leadership portraits:** `assets/leadership/` holds the two card-sized portraits, both
  cropped to 600×900 (2:3) for the contact and about cards. The full-resolution originals
  the club uploaded are kept beside them in `assets/leadership/source/`:

  | Card portrait | Source original | How it was made |
  | --- | --- | --- |
  | `president-shem-meso.jpg` | `source/president-shem-meso-original.jpg` (1066×1600) | Resized to 600×900 |
  | `vice-chairperson-barnabas-ochieng.jpg` | `source/barnabas-and-shem-pair-original.jpg` (1066×1600) | Cropped to the figure on the left, so President Shem is trimmed out of frame |

  To regenerate the Vice Chairperson crop:

  ```bash
  convert assets/leadership/source/barnabas-and-shem-pair-original.jpg \
    -crop 300x450+205+415 +repage -resize 600x900 \
    -unsharp 0x0.75+0.5+0.015 -strip -quality 90 \
    assets/leadership/vice-chairperson-barnabas-ochieng.jpg
  ```

  Cards render the portraits at 104×139 (3:4) with `object-fit:cover`, so one frame size
  suits every bearer, portrait or square.

## Event advert (poster band)

`index.html` and `tournaments.html` carry a poster-style advert for the next fixture
(`#event`). It mirrors the site's own fixture card, so the **single place to edit an
event** is:

1. the `#event` block in `tournaments.html` (the full poster) and the `compact` copy in
   `index.html`;
2. the two `data-countdown` targets in each block: first round and entries-close time;
3. the M-Pesa line in the poster footer, if the entry reference changes.

The poster artwork is currently `assets/tournament-prep-01.jpg` as a stand-in — the
designed event poster has not arrived yet; swap that `src` (both blocks) to drop it in.
Both blocks are marked with an `EVENT ADVERT` comment. Visitors can respond from the
advert itself: registration form, WhatsApp entry, a Google Calendar "add to calendar"
link, phone calls to the Secretary/Treasurer, or email.

## Contacts shown on the site

| Who | Role | Number / email |
| --- | --- | --- |
| Shem Meso | President & Head Coach | 0729 037 585 · shemeso26@gmail.com |
| Barnabas Ochieng | Vice Chairperson | no published line yet — routed through the academy office |
| Gladys Langat | Secretary | 0723 397 573 (**new line**, flagged on the site) · WhatsApp |
| Julieann Njambi | Treasurer | 0722 709 727 · WhatsApp |
| Academy office | General & schools | kerichochessacademy@gmail.com |

## Where submissions go

Every form POSTs to a Google Apps Script endpoint; paste your deployed Web App URL into
`SHEETS_ENDPOINT` in `js/smc.js`. `js/forms.js` reads the same setting (and the same WhatsApp
number) from `window.SMC`, so **one line turns the whole site's forms on at once**. Until
then, every form gracefully falls back to a **WhatsApp confirmation button** pre-filled with
the entrant's details (nothing is lost, no backend required). Payments reference M-Pesa
Paybill **880100**.

## Run locally

```bash
python3 -m http.server 8000          # static site only
node server/server.js                # static site + live multiplayer (/ws)
```

Then open `http://localhost:8000` (or `http://localhost:8080` for the Node server). The Node
server needs no install step — it has no dependencies.

## Deploy with GitHub Pages

1. Push this folder to a GitHub repository.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Save. GitHub will publish the site at the Pages URL shown there.

## Content notes

- The coach's name is spelt **Shem Meso** (single `s`) in all titles, headings and alt text.
- WhatsApp and phone links use `+254 729 037 585` (President & Head Coach),
  `+254 723 397 573` (Secretary) and `+254 722 709 727` (Treasurer); email links use
  `shemeso26@gmail.com` and `kerichochessacademy@gmail.com`.
- The Vice Chairperson, Barnabas Ochieng, has no published personal number: his card and
  his footer entry both route through `kerichochessacademy@gmail.com`. Give him a direct
  line on `contact.html#team` (and the footers) as soon as one is published.
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
├── events.html       event.html       register.html      consent.html
├── css/
│   ├── kiddos.css    (template theme)      chess.css     (club restyle + chess components)
│   ├── events.css    (events listing · event detail · stepped form shell)
│   └── animate.css · aos.css · owl carousel · magnific-popup · icon fonts css
├── js/
│   ├── jquery · bootstrap · owl · aos · waypoints · stellar · scrollax (template stack)
│   ├── kiddos-main.js (template runtime)   smc.js        (academy runtime)
│   ├── forms.js      (stepped runtime for register.html + consent.html)
│   ├── chess.js · play.js · live.js · board3d.js         (the chess core)
│   ├── engine.js     (computer opponent: alpha-beta, 3 levels, no deps)
│   ├── engine.worker.js  (runs the engine off the main thread)
│   └── online.js     (browser side of live multiplayer)
├── fonts/   (flaticon · icomoon · ionicons · open-iconic)
├── assets/  (crest logo.png / logo-light.png / favicon.png, the Secretary's
│            gladys-*.jpg photos from Samarkand 2026, event-poster.jpg,
│            hero-dark-board.jpg and the free-stock photos/ set)
│   ├── photos/      (Pexels-licensed replacement photography — drop-in slot)
│   └── leadership/  (board portraits: 600×900 president-shem-meso.jpg and
│                    vice-chairperson-barnabas-ochieng.jpg, plus source/ originals)
├── server/
│   └── server.js     (static file server + WebSocket game rooms, zero dependencies)
└── kiddos-master.zip   (uploaded source template, for reference)
```

Site structure follows the **Kiddos** template (Bootstrap 4), restyled with the club's palette and components.
