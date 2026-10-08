# Kericho Chess Club & Academy

A multi-page website for Kericho Chess Club & Academy, Kenya. The structure follows
**Chess Kenya's site** (chesskenya.co.ke) section for section — hero slider, counters / links
row, image band, About + Values, **PARTNERS**, **CALENDER** event cards with `Date` and
`Venue`, **TOP PLAYERS**, **News** with `on:` / `By:` / *Get the Whole Story* — while the
content, palette and photography are the academy's own: **dark navy + gold** ("night") theme.

## Structure

Every page shares the same furniture, in the same order:

1. **Top bar** — location, phone, email, socials (`nk-topbar`).
2. **Nav** — crest, wordmark, eight links, gold *Join Us* pill (`nk-nav`, sticky).
3. **Page banner** — a *plain centred title* with one line under it
   (e.g. `Upcoming Events / Check em out!`), on a darkened band (`hero-wrap hero-wrap-2`).
   No breadcrumb, no kicker, no invented overlay copy.
4. **Body** — the sections for that page (see the table below).
5. **CTA band** — one line + one button (`nk-cta`).
6. **Slim footer** — crest, `© YEAR Kericho Chess Club & Academy · Forward Ever, Backward
   Never`, and the three social icons (`nk-footer`). **There is deliberately no link row or
   menu at the bottom** — navigation lives in the nav bar, contacts live on
   `contact.html#team`.

### Homepage section order (mirrors chesskenya.co.ke)

`hero slider` (3 slides, *Join Us*) → `#section-counter` (Learners · Events · Schools ·
Boards) → **image band** → `#about` (About + **Our Values** list + *Read More*) →
**PARTNERS** strip → `#calendar` (**Calender** — event cards with `Date`, `Venue`,
*Register*, *More Events*) → `#players` (**Top players** + *All Players*) → `#news`
(News rows with `on: dd/mm/yyyy`, `By: …`, long excerpt, *Get the Whole Story*).

### Layers

- **Template layer:** `css/kiddos.css` (Kiddos / Colorlib, Bootstrap 4, CC BY 3.0) — grid,
  buttons, owl carousel, counters, utility classes. Untouched.
- **Club components:** `css/chess.css` — the academy components (broadcast room, countdown
  cards, ticker, FAQ accordion, registration forms, honour roll, steps strip, product shelf,
  team cards, Samarkand gallery) and their light-theme paint. Kept for backwards safety.
- **Night theme:** `css/night.css` — loads last and repaints everything dark navy + gold, and
  defines the shared furniture (`nk-topbar`, `nk-nav`, `nk-cta`, `nk-footer`, `nk-sec`,
  `nk-card`, `nk-event`, `nk-newsitem`, `nk-player`, `nk-strip`, `nk-counter`, `nk-band`).
  Section 12 of the file holds the reference-site blocks added in this round: plain banner,
  counters row, image band, partners strip, values list, chips, dark table, countdown bands.
  Tokens live at the top of the file: `--nk-gold:#f0b64a`, `--nk-bg:#05121f`, etc.
- **Academy crest:** `assets/logo.png` (black line art), `assets/logo-light.png` (white) and
  **`assets/logo-gold.png`** (the gold knockout the night theme uses in the nav and footer);
  `assets/favicon.png` is the site icon.
- **Runtime:** `js/kiddos-main.js` (nav, reveals, counters, owl on the testimony slider),
  `js/smc.js` (countdowns, FAQ accordion, registration / membership / enquiry forms),
  `js/hero-slider.js` (home hero crossfade), `js/chess.js` + `js/play.js` + `js/live.js` +
  `js/board3d.js` (playable board, broadcast room, WebGL board).

### Page generator

The eight page files are generated, so the head, nav, banner, CTA band and footer stay
identical everywhere; only the body differs.

```bash
node _build/build.mjs        # writes the 8 pages into the site root
```

- `_build/shell.mjs` — `head`, `banner`, `ctaBand`, `footer`, `scripts`
- `_build/build.mjs` — assembles each page (titles, descriptions, active nav item)
- `_build/pages/*.html` — the body block of each page

Edit the body blocks (or `shell.mjs` for global furniture), then re-run the command.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Hero slider (3 clean slides), **counters**, image band, **About + Values**, **Partners**, **Calender** event cards, **Top players**, **News** |
| `about.html` | Story, crest band, **vision / mission / values**, **twelve aims & objectives**, **milestones**, office bearers with portraits, club & kit gallery |
| `coaching.html` | Six inclusions, **four tracks** (school, private, prep, Saturday club), the four-phase method, fees + M-Pesa box, FAQ |
| `tournaments.html` | Next fixture with two live countdowns, **Calender** cards, eight categories + fee table, registration form, honour roll |
| `live.html` | **Broadcast room:** Board 1 with clocks, eval bar, move list, spectator feed, notation ticker, controls, how-to-watch |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo), game state, notation, coach's note, Lichess + coaching cards |
| `shop.html` | Four products with one-tap WhatsApp ordering, three-step ordering strip, M-Pesa box |
| `contact.html` | **Office bearers** (four portrait cards + academy office band), membership form + fee table, WhatsApp enquiry composer, FAQ, **Secretary's Samarkand gallery + quote** |

Anchor targets used by the rest of the site: `contact.html#team`, `contact.html#membership`,
`contact.html#enquiry`, `contact.html#secretary`, `tournaments.html#event`,
`tournaments.html#register`, `tournaments.html#honour-roll`, `about.html#people`,
`about.html#objectives`, `about.html#crest`, `index.html#calendar`, `index.html#players`.

## Photos

**The site publishes no photographs of children or learners.** The academy asked for this
explicitly, so the learner photos that were in the repository have been **deleted**:
`orig-01.jpg` … `orig-05.jpg`, `coaching-session.jpg`, `tournament-focus.jpg`,
`hero-chess-academy.jpg` and `tournament-prep-07.jpg` are no longer part of the site (they
remain in the git history if they are ever needed again). `about.html` states the policy in
plain words, so visitors understand why the gallery shows boards and halls rather than faces.

Everything on the pages is the academy's own photography:

- **Heroes and page banners:** `hero-morning.jpg` (classroom + board), `hero-dark-board.jpg`
  (pieces on a board), `tournament-prep-01/02/03/04/05/06/08/09/10.jpg` — empty halls, laid
  tables, boards and clocks.
- **Image band on the homepage:** `tournament-prep-05.jpg` (the hall, set for round one).
- **Club & kit gallery, products:** `chess-materials.jpg`, `shelf-workbook.jpg`,
  `shelf-clock.jpg`, `shelf-kit.jpg`.
- **Board piece art:** the 2D boards on Live and Play render local PNG pieces
  (`assets/pieces/`), so pieces show on every device without relying on system chess-glyph
  fonts.
- **Leadership portraits:** `assets/leadership/` and `assets/` hold the card-sized portraits,
  all cropped to 600×900 (2:3) for the contact and about cards. Full-resolution uploads are
  kept beside them in `assets/leadership/source/`:

  | Card | Portrait file | Source original | How it was made |
  | --- | --- | --- | --- |
  | Shem Meso · President & Head Coach | `leadership/president-shem-meso.jpg` | `source/president-shem-meso-original.jpg` | Resized to 600×900 |
  | Barnabas Ochieng · Vice Chairperson | `leadership/vice-chairperson-barnabas-ochieng.jpg` | `source/vice-chairperson-barnabas-event-original.jpg` (from `Mr. Ochieng 3.jpeg`) | Full-length event crop to 600×900 |
  | Gladys Langat · Secretary | `gladys-langat-portrait.jpg` | — | Cropped to 600×900 for the card frame |
  | Julieann Njambi · Treasurer | `njambi-treasurer.jpg` | `Njambi.jpeg` (960×1440) | Resized to 600×900 |

  **Portrait correction (Oct 2026):** the Vice Chairperson card first showed a mis-cropped
  portrait (a figure from the President's pair photo who is not Barnabas), then a bathroom
  selfie. It now uses the club's own photograph of him at the wetlands event — the same shot
  the club uploaded, cropped in full length. The superseded crops stay in `source/` for the
  record. Regenerate with:

  ```bash
  convert "Mr. Ochieng 3.jpeg" -crop 743x1114+0+430 +repage -resize 600x900^ \
    -gravity north -extent 600x900 -strip -quality 88 \
    assets/leadership/vice-chairperson-barnabas-ochieng.jpg
  ```

  Cards render the portraits at 104×139 (3:4) with `object-fit:cover`, so one frame size
  suits every bearer, portrait or square.

## Fixtures and the calendar

The **single place to edit an event** is:

1. the event cards in `index.html#calendar` and `tournaments.html#calendar`;
2. the countdown targets in `tournaments.html#next`: first round (28 Nov 2026, 09:00 EAT)
   and entries-close (21 Nov 2026, 18:00 EAT). `js/smc.js` fills `.cd-d/.cd-h/.cd-m/.cd-s`
   inside each `[data-countdown]` element, so any block with those four spans works;
3. the dates, venue and M-Pesa reference in the copy of the card and the registration form.

## Contacts shown on the site

| Who | Role | Number / email |
| --- | --- | --- |
| Shem Meso | President & Head Coach | 0729 037 585 · shemeso26@gmail.com |
| Barnabas Ochieng | Vice Chairperson | no published line yet — routed through the academy office |
| Gladys Langat | Secretary | 0723 397 573 (**new line**) · WhatsApp |
| Julieann Njambi | Treasurer | 0722 709 727 · WhatsApp |
| Academy office | General & schools | 0729 037 585 · kerichochessacademy@gmail.com |

The Treasurer's portrait card appears on `contact.html#team` only; `about.html#people`
lists her in the roster and links across to that card.

## Forms

Registration/membership forms POST to a Google Apps Script endpoint; paste your deployed
Web App URL into `SHEETS_ENDPOINT` in `js/smc.js`. Until then, forms gracefully fall back
to a **WhatsApp confirmation button** pre-filled with the entrant's details (nothing is
lost, no backend required). Payments reference M-Pesa Paybill **880100**,
account `123003#LearnersName`.

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

- The coach's name is spelt **Shem Meso** (single `s`) in all titles, headings and alt text.
- WhatsApp and phone links use `+254 729 037 585` (President & Head Coach),
  `+254 723 397 573` (Secretary) and `+254 722 709 727` (Treasurer); email links use
  `shemeso26@gmail.com` and `kerichochessacademy@gmail.com`.
- The Vice Chairperson, Barnabas Ochieng, has no published personal number: his card routes
  through `kerichochessacademy@gmail.com` / the academy office line. Give him a direct line
  on `contact.html#team` as soon as one is published.
- Product prices are carried over from the previous site and should be confirmed before launch.
- Season metrics (schools, learners, tournaments, hosted hours) are marketing figures; adjust to taste.
- The live broadcast room replays a scripted demo game between fixtures; wire in a real feed
  when streaming hardware/accounts are ready.
- The site does not collect or store form submissions unless the Apps Script endpoint is set;
  otherwise it prepares a WhatsApp message for the visitor to review and send.

## Files

```text
.
├── index.html        coaching.html    tournaments.html   live.html
├── play.html         shop.html        about.html         contact.html
├── _build/
│   ├── build.mjs     (page assembler: node _build/build.mjs)
│   ├── shell.mjs     (head · nav · banner · CTA band · slim footer · scripts)
│   └── pages/        (the body block of each of the eight pages)
├── css/
│   ├── kiddos.css    (template theme)      chess.css     (club components + light paint)
│   ├── night.css     (dark navy + gold theme: repaints every component, adds the
│   │                  top bar / nav / CTA / slim footer / cards / calendar furniture,
│   │                  plus the reference-site sections in §12)
│   └── animate.css · aos.css · owl carousel · magnific-popup · icon fonts css
├── js/
│   ├── jquery · bootstrap · owl · aos · waypoints · stellar · scrollax (template stack)
│   ├── kiddos-main.js (template runtime)   smc.js        (academy runtime)
│   └── chess.js · play.js · live.js · board3d.js         (the chess core)
├── fonts/   (flaticon · icomoon · ionicons · open-iconic)
├── assets/  (academy photography — empty halls, boards, kit and non-learner shots only;
│            crest logo.png / logo-light.png / logo-gold.png / favicon.png, the
│            Treasurer's njambi-treasurer.jpg and the Secretary's gladys-*.jpg
│            photos from Samarkand 2026)
│   ├── leadership/  (board portraits, 600×900: president-shem-meso.jpg and
│   │                 vice-chairperson-barnabas-ochieng.jpg, plus source/ originals)
│   └── pieces/      (PNG piece art for the 2D boards)
└── kiddos-master.zip   (uploaded source template, for reference)
```

Site structure follows the **Kiddos** template (Bootstrap 4), restyled with the club's palette
and components.
