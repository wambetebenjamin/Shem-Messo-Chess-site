# Kericho Chess Club & Academy

A multi-page website for Kericho Chess Club & Academy, Kenya. The markup skeleton follows
**Chess Kenya's site structure** (chesskenya.co.ke): a slim utility top bar, a sticky nav with
an *Enrol* pill, a photo hero with quick-link strip, an About block, a calendar of events, a
standings block, a news list and a quiet footer. The content, palette and photography are the
academy's own — **dark navy + gold** ("night") theme.

## Structure

Every page shares the same furniture, in the same order:

1. **Top bar** — location, phone, email, socials (`nk-topbar`).
2. **Nav** — crest, wordmark, eight links, gold *Enrol* pill (`nk-nav`, sticky).
3. **Page banner** — photo + kicker + breadcrumb (`hero-wrap hero-wrap-2`).
4. **Body** — section per page (see the table below).
5. **CTA band** — one line + one button, in place of the old photo-intro band (`nk-cta`).
6. **Slim footer** — crest, the academy name, eight links, three socials, one contact line
   on a dark bar (`nk-footer`). The crowded four-column footer (news blocks, newsletter box,
   duplicate socials, office-bearer list) is **gone**; the same information now lives on
   `about.html#people` and `contact.html#team`.

### Layers

- **Template layer:** `css/kiddos.css` (Kiddos / Colorlib, Bootstrap 4, CC BY 3.0) — grid,
  buttons, owl carousel, counters, utility classes. Untouched.
- **Club components:** `css/chess.css` — the academy components (broadcast room, countdown
  cards, ticker, FAQ accordion, registration forms, honour roll, steps strip, product shelf,
  team cards, Samarkand gallery) and their light-theme paint. Kept for backwards safety.
- **Night theme:** `css/night.css` — loads last and repaints everything dark navy + gold. It
  also defines the shared furniture (`nk-topbar`, `nk-nav`, `nk-cta`, `nk-footer`, `nk-sec`,
  `nk-card`, `nk-event`, `nk-newsitem`, `nk-player`, `nk-strip`, `nk-ticker`, `nk-stats`).
  Tokens live at the top of the file: `--nk-gold:#f0b64a`, `--nk-bg:#05121f`, etc.
- **Academy crest:** `assets/logo.png` (black line art), `assets/logo-light.png` (white) and
  **`assets/logo-gold.png`** (the gold knockout the night theme uses in the nav and footer);
  `assets/favicon.png` is the site icon.
- **Runtime:** `js/kiddos-main.js` (nav, reveals, counters, owl on the testimony slider),
  `js/smc.js` (countdowns, FAQ accordion, registration / membership / enquiry forms),
  `js/hero-slider.js` (home hero crossfade), `js/chess.js` + `js/play.js` + `js/live.js` +
  `js/board3d.js` (playable board, broadcast room, WebGL board).

The page files are generated from `index/about/coaching/tournaments/live/play/shop/contact`,
so the head, nav, CTA and footer stay identical across the eight pages; only the body differs.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Hero crossfade slider with stat badges, news ticker, four quick links, About block, "what we do", **calendar** (three event cards + live countdown), **standings** (top of the tables), programmes, Season 26 stat band, testimonies, news list, gallery strip, enquiry form |
| `about.html` | Story, crest band, **vision / mission / values**, **twelve aims & objectives**, **milestones timeline**, the office bearers with portraits, partner schools band, season gallery |
| `coaching.html` | Six inclusions, photo band, **four tracks** (school, private, prep, Saturday club), the four-phase method, fees + M-Pesa box, FAQ |
| `tournaments.html` | Next fixture with two live countdowns, three-step entry, **event advert** (poster band with response buttons: register, WhatsApp, calendar, calls, email), eight age categories, registration form, honour roll, gallery |
| `live.html` | **Broadcast room:** Board 1 with clocks, eval bar, move list, spectator feed, notation ticker, controls — plus "on the card" schedule cards |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo), game state, notation, coach's note, Lichess puzzle + Kwaarena cards |
| `shop.html` | Four products with one-tap WhatsApp ordering, three-step ordering strip, school quote band |
| `contact.html` | Four ways in, **direct lines** (portrait cards for the four bearers + academy office band), membership form, WhatsApp enquiry composer, FAQ, **Secretary's Samarkand gallery + quote** |

Anchor targets used by the rest of the site: `contact.html#team`, `contact.html#membership`,
`contact.html#enquiry`, `contact.html#secretary`, `tournaments.html#register`,
`tournaments.html#honour-roll`, `about.html#people`, `about.html#objectives`,
`about.html#crest`, `index.html#calendar`, `index.html#players`.

## Photos

The site displays the academy's own photography throughout: `assets/orig-01.jpg` …
`orig-05.jpg`, `assets/tournament-prep-01.jpg` … `tournament-prep-10.jpg` and the hero,
coaching, tournament and materials shots in `assets/`. Kiddos stock imagery is not used.

- **Club shelf product shots:** `assets/shelf-workbook.jpg`, `shelf-clock.jpg` and
  `shelf-kit.jpg` illustrate the workbook, digital clock and club kit cards;
  the set card uses the academy's own `chess-materials.jpg` photo.
- **Board piece art:** the 2D boards on Live and Play render local PNG pieces
  (`assets/pieces/`), so pieces show on every device without relying on system
  chess-glyph fonts.
- **Leadership portraits:** `assets/leadership/` and `assets/` hold the four card-sized
  portraits, all cropped to 600×900 (2:3) for the contact and about cards. The
  full-resolution originals the club uploaded are kept beside them in
  `assets/leadership/source/`:

  | Card | Portrait file | Source original | How it was made |
  | --- | --- | --- | --- |
  | Shem Meso · President & Head Coach | `leadership/president-shem-meso.jpg` | `source/president-shem-meso-original.jpg` | Resized to 600×900 |
  | Barnabas Ochieng · Vice Chairperson | `leadership/vice-chairperson-barnabas-ochieng.jpg` | `source/vice-chairperson-barnabas-selfie-original.jpg` (from `Mr. Ochieng.jpeg`) | Portrait crop, 600×900 |
  | Gladys Langat · Secretary | `gladys-langat-portrait.jpg` | — | Cropped to 600×900 for the card frame |
  | Julieann Njambi · Treasurer | `njambi-treasurer.jpg` | `Njambi.jpeg` (960×1440) | Resized to 600×900 |

  **Portrait correction (Oct 2026):** the Vice Chairperson card previously showed a
  mis-cropped portrait (the figure on the left of the President's pair photo, who is not
  Barnabas). It now uses the club's own photo of him at the wetlands event — see
  `source/vice-chairperson-barnabas-selfie-original.jpg` and
  `source/vice-chairperson-barnabas-event-original.jpg`; the old crop is kept at
  `source/vice-chairperson-previous-crop.jpg` for the record. Regenerate with:

  ```bash
  convert "Mr. Ochieng.jpeg" -crop 660x990+150+200 +repage -resize 600x900 \
    -modulate 104,102 -unsharp 0x0.7+0.5+0.02 -strip -quality 90 \
    assets/leadership/vice-chairperson-barnabas-ochieng.jpg
  ```

  Cards render the portraits at 104×139 (3:4) with `object-fit:cover`, so one frame size
  suits every bearer, portrait or square.

## Event advert (poster band)

`tournaments.html#event` carries a poster-style advert for the next fixture, and
`index.html#calendar` mirrors it as an event card. The **single place to edit an event** is:

1. the `#event` block in `tournaments.html` (full advert) and the matching card in
   `index.html#calendar`;
2. the `data-countdown` targets: first round (28 Nov 2026, 09:00 EAT) and entries-close
   (21 Nov 2026, 18:00 EAT). `js/smc.js` fills `.cd-d/.cd-h/.cd-m/.cd-s` inside each
   `[data-countdown]` element, so any block with those four spans works;
3. the dates, venue and M-Pesa reference in the copy, and the Google Calendar link
   (`dates=` parameter, UTC).

The poster artwork is currently `assets/tournament-prep-01.jpg` as a stand-in — the
designed event poster has not arrived yet; swap that background image (both blocks) to
drop it in.
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
├── css/
│   ├── kiddos.css    (template theme)      chess.css     (club components + light paint)
│   ├── night.css     (dark navy + gold theme: repaints every component, adds the
│   │                  top bar / nav / CTA / slim footer / cards / calendar furniture)
│   └── animate.css · aos.css · owl carousel · magnific-popup · icon fonts css
├── js/
│   ├── jquery · bootstrap · owl · aos · waypoints · stellar · scrollax (template stack)
│   ├── kiddos-main.js (template runtime)   smc.js        (academy runtime)
│   └── chess.js · play.js · live.js · board3d.js         (the chess core)
├── fonts/   (flaticon · icomoon · ionicons · open-iconic)
├── assets/  (academy photography — original pictures from the previous build;
│            crest logo.png / logo-light.png / logo-gold.png / favicon.png, the
│            Treasurer's njambi-treasurer.jpg and the Secretary's gladys-*.jpg
│            photos from Samarkand 2026)
│   └── leadership/  (board portraits, 600×900: president-shem-meso.jpg and
│                    vice-chairperson-barnabas-ochieng.jpg, plus source/ originals)
└── kiddos-master.zip   (uploaded source template, for reference)
```

Site structure follows the **Kiddos** template (Bootstrap 4), restyled with the club's palette and components.
