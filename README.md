# Kericho Chess Club & Academy

A multi-page website for Kericho Chess Club & Academy, Kenya — academy content on the
**Kiddos** template structure (Bootstrap 4, Colorlib, CC BY 3.0), wearing the club's own
light design: a white header, white cards, and a two-colour palette — navy `#16232f` for
structure and green `#3aa85c` for accent, with white and greys doing the neutral work. No
other hue survives anywhere in the stylesheets or the pages: the template's blue, red and
purple are all gone.

## What this build is

The homepage was rebuilt on the **uploaded page template** (`chess website template for
pages.jpeg`), with the club's own palette and features. The homepage holding page
("Coming Soon") is gone: the real site is back, and every page is reachable again.

- **Header:** white bar, dark labels, green underline on the current page, and the green
  **Enrol Now** pill. No dark header. Sticks to the top on scroll.
- **Home hero:** dark panel — green "Master the Game." over a white
  "Elevate Your Strategy.", two calls to action, a proof strip, and the board picture with a
  small caption chip.
- **Service cards:** four white cards on a row (Weekly School Coaching, Private Lessons,
  Inter-School Tournaments, Saturday Academy Club), green-tinted icon tiles, hover lift.
- **Season calendar:** three cards (next fixture, the weekly club night, the next friendly)
  with a small chip, a date/format meta row and a link, plus a **View all tournaments** link.
- **Night band — "The Tournament Floor":** a dark band of the academy's own photographs:
  finals tables, the fixture hall, the vinyl and rubber mats, and squads on the floor. Every
  tile opens full screen (magnific popup, which the theme already loads).
- **Footer:** the template's centred round social row under the copyright line, on every page.

Everything the previous homepage carried is still here: the welcome block and "What We
Offer", the President & The Platform cards, the programmes grid, the season counters, the
parents' testimonials, the coaching enquiry form (WhatsApp composer), the club shelf with
one-tap WhatsApp ordering, the academy updates row, the office-bearers footer column and the
full contact set.

The site structure stays the **Kiddos** template (Bootstrap 4) with the academy's content,
so all eight pages still load the same navbar, sticky behaviour, reveals, counters and
carousel runtime.

## Structure

- **Theme layer:** `css/kiddos.css` (the template's stylesheet) drives layout and components.
- **Club layer:** `css/chess.css` restyles it with the academy palette and adds the
  chess-specific components (broadcast stage, countdown cards, ticker, FAQ accordion,
  registration forms, honour-roll table, steps strip, product shelf) — and, at the end of the
  file, the **light template layer**: the white header, the home hero, the service cards, the
  season-calendar cards, the night bands, the photo wall and the footer social row.
- **Academy crest:** the official Kericho Chess Academy crest (pawn, king, knight, motto
  *Forward Ever Backward Never*) sits in the nav, the footer, the event poster lockup and a
  dedicated crest band on the about page; it doubles as the site favicon
  (`assets/logo.png`, `assets/logo-light.png`, `assets/favicon.png`).
- **Template runtime:** `js/kiddos-main.js` (nav, sliders, counters, reveals, loader) on the
  jQuery/Bootstrap/owl/aos/waypoints stack shipped in `js/`.
- **Academy runtime:** `js/smc.js` (countdowns, FAQ accordion, registration / membership /
  subscribe and WhatsApp-composer forms).
- The chess engine lives in `js/chess.js` (chess.js by Jeff Hlywa, BSD license) and powers
  `js/play.js` (playable board) and `js/live.js` (broadcast room); `js/board3d.js` renders
  the 3D board stage. The homepage no longer runs `js/hero-slider.js`; the hero is a static
  framed panel again, so that file is unused by the pages (kept for reference).

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Framed hero + board panel, service cards, season calendar, welcome & offerings, President & The Platform, programmes, season counters, testimonials, enquiry form, club shelf, academy updates, and the **Tournament Floor** photo wall |
| `coaching.html` | The three coaching tracks, four-phase method, fees & FAQ |
| `tournaments.html` | **Event advert (poster band)** with live countdowns and response buttons, next fixture, eight age categories, M-Pesa entry steps, registration form, honour roll |
| `live.html` | **Broadcast room:** live-style Board 1 with clocks, eval bar, move list, spectator feed — plus the broadcast card |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo) + the daily puzzle |
| `shop.html` | Materials & kits with one-tap WhatsApp ordering + Complete Club Kit quote banner |
| `about.html` | Academy story, **crest band with the academy motto**, **the office bearers with portraits**, the partner schools, the squads, values and a two-row season gallery (halls, mats and club trips included) |
| `contact.html` | Membership form, WhatsApp coaching-enquiry composer, FAQ, contact cards, **direct lines for all four office bearers (photo cards)** and the **Secretary's Samarkand Olympiad gallery** |

### Navigation

All eight pages share one bar: **Home · Coaching · Tournaments · Live · Play · Shop · About ·
Contact**, then the green **Enrol Now** pill. Links are labelled (the short-lived icon-only
pass is gone), the bar is white, and the current page is marked with green. Contact stays as
the last item, and the pill routes to `contact.html`.

## Photos

Every photograph on the site is the academy's own, and **no photograph shows a learner**.

On 8 October 2026, at the club's request, every picture of children was taken off the site:
the old page-header photograph, the coaching-session and tournament-focus shots, and
`orig-01`…`orig-05` (the classroom and tournament frames). They were replaced with the
academy's own empty-hall, table-and-clock, mats, shelf and adult-portrait photographs, and
the files were deleted from the repository — the club's originals are kept privately outside
the site.

- **Homepage:** `assets/hero-dark-board.jpg` in the hero frame; `assets/tournament-prep-0*.jpg`
  and `assets/hero-morning.jpg` (the empty classroom) through the cards, programme blocks and
  updates; the Tournament Floor wall uses tournament-prep 01/03/04/07/08 plus the mats.
- **Mats (uploaded):** `assets/mats-vinyl.jpg` and `assets/mats-rubber.jpg`, extracted from
  `merchandise.zip` and used on the club shelf and in the photo wall.
- **Tone:** the photographs are the club's own, at their true colours — no grading, no
  colour cast. The roll-up boards, the mats, the kit bag and the classroom are as they came
  off the camera, and their greens now sit with the site's own green.
- **Club trips (uploaded):** `assets/club/vice-chairperson-on-the-road.jpg` and
  `assets/club/vice-chairperson-out-of-town.jpg`, cropped from the two 8 October uploads
  (`Mr. Ochieng 2.jpeg` and `Mr. Ochieng 3.jpeg`), shown in the about-page gallery.
- The club's untouched uploads stay in the repository root (`Mr. Ochieng*.jpeg`,
  `Njambi.jpeg`, `njambi 2.jpeg`, `chess website template for pages.jpeg`); the web-ready
  copies live under `assets/`, so nothing is lost when a picture is re-cropped. The uploaded
  `kiddos-master.zip` is no longer published: it carries the template's own stock photographs
  of children, so it is git-ignored and stays on the working copy only.
- **Board piece art:** the 2D boards on Live and Play render local PNG pieces
  (`assets/pieces/`), so pieces show on every device without relying on system chess-glyph fonts.

### Leadership portraits

All four office bearers now carry a portrait, cropped to 600×900 (2:3). Cards render them at
104×139 (3:4) with `object-fit:cover` and `object-position:center 22%`, so one frame size
suits every bearer.

| Card | Portrait | Made from |
| --- | --- | --- |
| Shem Meso · President & Head Coach | `president-shem-meso.jpg` | `source/president-shem-meso-original.jpg` (1066×1600) |
| Barnabas Ochieng · Vice Chairperson | `vice-chairperson-barnabas-ochieng.jpg` | `source/barnabas-ochieng-portrait-original.jpeg` (960×1280, uploaded 8 Oct 2026) |
| Gladys Langat · Secretary | `gladys-avatar.jpg`, `gladys-langat-portrait.jpg` | the Secretary's Samarkand photos |
| Julieann Njambi · Treasurer | `treasurer-julieann-njambi.jpg` | `source/treasurer-julieann-njambi-studio-original.jpeg` (960×1440) |

The Treasurer's card previously showed `JN` initials because no portrait existed; the slot is
filled. Her second photo (the smiling one on a red backdrop) is kept beside it as
`source/treasurer-julieann-njambi-smiling-original.jpeg` — swap the card image to it with a
one-line `src` change if the club prefers it.

To regenerate a 600×900 card from a portrait that is not already 2:3:

```bash
convert "new-portrait.jpeg" -resize 853x1280^ -gravity center -extent 853x1280 \
  -resize 600x900 -unsharp 0x0.75+0.5+0.015 -strip -quality 88 \
  assets/leadership/<role>-<name>.jpg
```

## The next event

The site carries one event at a time. For the Mashujaa Championship (Tuesday 20 October
2026, ACK Grace Hotel) the facts live in these places — change them together:

1. **`tournaments.html` · `#mashujaa`** — the event panel: venue, date, time, categories,
   entry fee, payment line and the registration-desk numbers, plus the club crest and motto.
2. **`tournaments.html` · the countdown card** — the two `data-countdown` targets
   (`2026-10-20T08:00:00+03:00` first round, `2026-10-19T18:00:00+03:00` entry closes) and the
   two `cd-band` labels above them.
3. **`tournaments.html` · categories and awards** — the six `cat-chip`s and the two
   `award-card`s.
4. **`tournaments.html` · `#register`** — the category dropdown, the KES 500 line and the
   Paybill 880100 / `123003#PlayersName` payment box.
5. **`index.html`** — the first season-calendar card and the latest-updates card.
6. **`live.html`** — the first `sched-card` (the fixture being streamed).
7. **the footer row on every page** — "Kericho Mashujaa Chess Championship · entry closes
   19 Oct".

The printed poster drops into the panel's right-hand column: save it as
`assets/mashujaa-2026-poster.jpg` and un-comment the `<img class="ev-poster">` line in
`#mashujaa` (both are marked with a comment).

## Contacts shown on the site

| Who | Role | Number / email |
| --- | --- | --- |
| Shem Meso | President & Head Coach | 0729 037 585 · shemeso26@gmail.com |
| Barnabas Ochieng | Vice Chairperson | no published line yet — routed through the academy office |
| Gladys Langat | Secretary | 0723 397 573 (**new line**, flagged on the site) · WhatsApp |
| Julieann Njambi | Treasurer | 0722 709 727 · WhatsApp |
| Academy office | General & schools | kerichochessacademy@gmail.com |

The footer of every page carries the **Office Bearers** column with those four entries and a
link through to the direct-lines section.

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
- Product prices are carried over from the previous site and should be confirmed before
  launch (the mats are the newest lines: vinyl 900, rubber 1,200).
- Season metrics (schools, learners, tournaments, coached hours) are marketing figures;
  adjust to taste.
- The hero proof strip repeats the counter figures (340 learners, 12 schools); keep the two
  in step if either changes.
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
│   ├── kiddos.css    (template theme)      chess.css     (club layer + light template layer)
│   └── animate.css · aos.css · owl carousel · magnific-popup · icon fonts css
├── js/
│   ├── jquery · bootstrap · owl · aos · waypoints · stellar · scrollax (template stack)
│   ├── kiddos-main.js (template runtime)   smc.js        (academy runtime)
│   ├── chess.js · play.js · live.js · board3d.js         (the chess core)
│   └── hero-slider.js (unused by the pages since the home hero was reframed)
├── fonts/   (flaticon · icomoon · ionicons · open-iconic)
├── assets/
│   ├── academy photography (heroes, orig-01…05, tournament-prep-01…10, coaching, materials)
│   ├── mats-vinyl.jpg · mats-rubber.jpg        (products, from merchandise.zip)
│   ├── club/            (the Vice Chairperson's club-trip photographs)
│   ├── leadership/      (600×900 office-bearer portraits + source/ originals)
│   ├── pieces/          (2D board piece art)
│   └── logo.png · logo-light.png · favicon.png
└── kiddos-master.zip   (uploaded template archive — git-ignored, not published)
```

Site structure follows the **Kiddos** template (Bootstrap 4); the homepage borrowed the page
shapes from `chess website template for pages.jpeg`, drawn in the club's own palette and
filled with the academy's own photographs.
