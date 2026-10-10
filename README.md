# Kericho Chess Club & Academy

A multi-page website for Kericho Chess Club & Academy, Kenya — academy content carried
onto the **Kiddos** template structure (Bootstrap 4, Colorlib, CC BY 3.0), restyled with
the club palette.

## Structure

The site retains its existing **Kiddos** (Colorlib) design: shared navigation, the original
homepage sections, service strips, course/staff cards, counters, testimony carousel,
gallery strip and the four-column footer. The homepage hero keeps its two-copy slider over
the supplied full-colour tournament video.

- **Theme layer:** `css/kiddos.css` (the template's stylesheet) drives layout and components.
- **Club layer:** `css/chess.css` restyles it with the academy palette and adds the
  chess-specific components: broadcast stage, countdown cards, ticker, FAQ accordion,
  registration forms, honour-roll table, steps strip, product shelf and the nav "Enrol" pill.
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
  the 3D board stage.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Existing Kiddos homepage structure with full-colour video hero, service strip, programmes, counters, testimonials, enquiry form, club shelf, academy updates and gallery |
| `coaching.html` | The three coaching tracks, four-phase method, fees & FAQ |
| `tournaments.html` | **Event advert (poster band)** with live countdowns and response buttons, next fixture with live countdown, eight age categories, M-Pesa entry steps, registration form, honour roll |
| `live.html` | **Broadcast room:** live-style Board 1 with clocks, eval bar, move list, spectator feed — plus the broadcast card |
| `play.html` | **Playable board:** full-rules pass-and-play chess (check, mate, castling, undo) + the daily puzzle |
| `shop.html` | Materials & kits with one-tap WhatsApp ordering + Complete Club Kit quote banner |
| `about.html` | Academy story, **crest band with the academy motto**, **the office bearers with portraits**, the partner schools, the squads, values and the season gallery |
| `contact.html` | Membership form, WhatsApp coaching-enquiry composer, FAQ, contact cards, **direct lines for the office bearers (portrait cards)** and the **Secretary's Samarkand Olympiad gallery** |

All eight pages share the Kiddos navbar (with the **Enrol Now** pill) and the template
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

## Photos

Static photo areas use chessboards, materials and club equipment rather than photos of
children. Adult office-bearer portraits remain in their existing leadership/contact sections.
The homepage hero uses the supplied tournament video with a full-colour board image as its
poster fallback. No black tint or grayscale filter is applied to photographs.

- **Club shelf product shots:** `assets/shelf-workbook.jpg`, `shelf-clock.jpg` and
  `shelf-kit.jpg` illustrate the workbook, digital clock and club kit cards; the set card
  uses `assets/chess-materials.jpg`.
- **Hero video:** `assets/hero-background.mp4` is the user's supplied `Copy of CHESS TOURNAMENT VIDEO.mp4`; it autoplays muted and loops behind the original hero copy.
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

`tournaments.html` carries the poster-style advert for the next fixture (`#event`) and
its registration actions. Update the event date, countdown targets and M-Pesa reference
there. The homepage links visitors through to the Tournaments page rather than duplicating
a second advert.

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
│   ├── kiddos.css    (template theme)      chess.css     (club restyle + chess components)
│   └── animate.css · aos.css · owl carousel · magnific-popup · icon fonts css
├── js/
│   ├── jquery · bootstrap · owl · aos · waypoints · stellar · scrollax (template stack)
│   ├── kiddos-main.js (template runtime)   smc.js        (academy runtime)
│   └── chess.js · play.js · live.js · board3d.js         (the chess core)
├── fonts/   (flaticon · icomoon · ionicons · open-iconic)
├── assets/  (academy photography — original pictures from the previous build;
│            crest logo.png / logo-light.png / favicon.png and the Secretary's
│            gladys-*.jpg photos from Samarkand 2026)
│   └── leadership/  (board portraits: 600×900 president-shem-meso.jpg and
│                    vice-chairperson-barnabas-ochieng.jpg, plus source/ originals)
└── kiddos-master.zip   (uploaded source template, for reference)
```

Site structure follows the **Kiddos** template (Bootstrap 4), restyled with the club's palette and components.
