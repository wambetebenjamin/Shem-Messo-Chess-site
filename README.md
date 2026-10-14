# Kericho Chess Club & Academy

## UI restored to the previous branch

The public website was restored from commit `04d18c773e4da0e8cc0a98881c6ad5b05391bbba` on `arena/1fbcaa8d-shem-messo-chess-site` (PR #22): `index.html`, `style.css`, `script.js`, and `assets/site-photos/`.

Subsequent requested enhancements remove the top contact strip, increase text sizes, and add a smoothly fading hero photo background, refined calls to action, accessible program dropdowns, and homepage overviews linking to separate detail pages. Its original navy/blue/white palette, fonts, hero, programs, team, merchandise and contact interface are preserved. The replacement green interface from this branch has been removed.

The backend work is retained separately, but **registration embeds, account controls, chess, feedback, FAQs, events and push opt-in are not currently exposed in this restored UI**. They must be integrated into the approved previous design without redesigning it. The backend documentation below describes the retained implementation, not features available through the current page. The restored site's enquiry form still opens WhatsApp and does not store its submissions.

### Hero and dropdown behavior

The hero cycles through three existing tournament photographs every four seconds with a 1.6-second crossfade. Previous/next, photo dots and pause/resume controls are provided. Autoplay continues while hovering or focusing the hero controls. It pauses off-screen, in a background tab or through the pause button; reduced-motion preferences disable autoplay and transitions. Failed images are skipped. The first photo stays visible without JavaScript.

The navigation program dropdown links to the existing program cards. The hero split-button dropdown opens the existing program enquiry dialog with the chosen program selected. Dropdowns support click/touch, keyboard arrows, Escape, outside clicks and tab navigation. The navy/blue/white palette and remaining page sections are preserved.

### Footer and team photo cards

Each page shares a footer with basic academy information, Kericho location, call/email/WhatsApp icons, page links, and the Facebook `@smesso` and TikTok `@kericho.chess.clu` handles already present in the original repository. No new social accounts or contact numbers were invented. Contact numbers and email are not printed in the footer.

Homepage team portrait cards crossfade every four seconds and link to the corresponding profile on the Team page. Controls support previous/next, individual photos and pause/resume. Autoplay does not stop on hover or when the carousel controls receive focus. It pauses when a profile link inside a card is focused (so keyboard focus is not hidden), off-screen, in background tabs, through the pause button or with reduced motion. Inactive cards are hidden from assistive technology and keyboard focus. Decorative divider lines and card outlines are removed; form boundaries and focus outlines remain for usability.

## Run

Requires **Node.js 22.13 or later** (SQLite is built into Node).

```sh
npm ci
npm start
```

Open port 3000. The server binds to `0.0.0.0`; set `PORT` to change it. All browser API and Socket.IO requests are same-origin, including proxied previews.

**This is now a Node application, not a static-only site.** GitHub Pages alone cannot provide accounts, online matchmaking, feedback storage or notifications. Deploy one Node process behind an HTTPS reverse proxy with WebSocket support. Set `NODE_ENV=production` for secure session cookies. The proxy must preserve the browser Host and forward HTTPS protocol; one trusted proxy hop is assumed. Do not expose the process directly on public HTTP in production.

## Public pages

The site is a real multi-page website. Each page has its own HTML document, title, description and active navigation item. Links also work on static hosting without server-side routing.

- `index.html` (or `/`): Home, with the existing hero slideshow, values, joining CTA and concise overviews of About Us, Programs, Team, Merchandise and Contact. Overview links open the separate pages for fuller information. The Home team overview now has smoothly crossfading portrait cards linking to the full Team page. Full staff profiles remain on that page.
- `about.html`: About Us and the academy's community introduction, immediately after Home in navigation.
- `programs.html`: junior chess, club/competitive chess and school programs. Dropdown links point to their cards on this page.
- `team.html`: the five existing staff profiles and photographs, separate from Home.
- `merchandise.html`: chess equipment and enquiry buttons.
- `contact.html`: the existing contact information and WhatsApp enquiry form. Program/item choices are carried in URL query parameters to prefill the enquiry; no personal details are stored or carried in those links.

Node hosting also redirects `/about`, `/programs`, `/team`, `/merchandise` and `/contact` to the matching document. Shared navigation/footer markup is repeated in each document; keep these consistent when updating links. All documents use the same `style.css` and `script.js`.

## Retained backend groundwork (not exposed in these pages)

The API includes accounts, beginner computer chess, matchmaking, a daily puzzle, private feedback and push subscriptions. Registration embeds, FAQs, events and a play interface from the removed redesign are **not in the current public frontend**. Previous `/registration`, `/events`, `/help` and `/play` placeholder document routes have been removed rather than showing Home under misleading URLs.

The membership form supplied earlier is `1FAIpQLSdbieIfMBN_VQPdNGKFHh1rPMa_JFpRZUUhkHEEU92DbUgJGw`; photo/video consent is `1FAIpQLSefyh1CBlzc_YsCPh9dp8oNl9dcBPjr4cNvjET8ob4ndaodzw`. These still require integration into the approved design. Event data remains in `events.json` for `/api/events`, initially empty pending confirmed dates. The retained backend is separate from the public contact form, which opens WhatsApp.

## Storage and operations

The first run creates private `data/academy.sqlite` and `data/secrets.json`. This directory is ignored by Git and **must be on persistent private storage in production**. Back it up securely; never serve it publicly. Passwords are bcrypt hashed; sessions use HTTP-only, same-site cookies and persistent SQLite storage. Feedback and push subscriptions are also private. The VAPID private key remains on the server. Optionally set `SESSION_SECRET` and `VAPID_SUBJECT` (a valid operator contact such as `mailto:...`). Keep the same signing secrets across restarts.

Review feedback on the server:

```sh
npm run feedback
```

Feedback has no public read endpoint or admin UI. Do not share the output publicly. Set a retention policy and delete old feedback/accounts when no longer needed. Email verification and password recovery for **play accounts** are not implemented; the membership form's own verification process is separate.

## Push notifications

The retained push API requires a future opt-in interface; there is no Events page or opt-in control in the current public frontend. HTTPS and browser Web Push support are required. On iOS, Web Push normally requires installing the site to the home screen. Visitors can unsubscribe in the site or browser settings. Only standard FCM, Mozilla and Apple push endpoints are accepted, preventing arbitrary server-side URL requests.

An authorised operator with server access sends updates:

```sh
npm run notify -- "Academy update" "Contact the academy for registration details." "/contact.html"
npm run notify -- "New event announced" "Contact the academy for confirmed details." "/contact.html"
```

Delivery needs outbound access to the subscriber's browser push provider. The Arena sandbox restricts those hosts, so real push delivery cannot be verified here. Delivery errors are reported; expired subscriptions are removed. Updating events does not automatically send a push. Embedded Google Form submissions do **not** send automatic notifications or report completion back to this server; that would need a separate authorised Google Forms integration.

## Chess limitations

- Computer uses legal moves and a simple capture/reply heuristic; it is not Stockfish.
- Daily puzzle rotates through three validated mate-in-one positions at midnight in `Africa/Nairobi`. Expand `lib/chess.js` with reviewed FENs for a larger collection.
- Online play matches distinct signed-in accounts in one server process. Games are untimed, authoritative on the server and held in memory. Leaving or disconnecting ends the live session; a restart loses active games. Horizontal deployment needs shared matchmaking/game storage and a Socket.IO adapter.
- Standard legal moves, castling, en passant, promotions, checks, mate and draws use `chess.js`. Public display names, not account emails, are shared with opponents. Use a nickname.

## Tests

```sh
npm test
# With a Playwright browser and system dependencies installed:
npx playwright install --with-deps chromium
npm start # in a separate terminal (current website, port 3000)
# In another terminal, for the independent template tests:
PORT=3001 TEMPLATE_PREVIEW=1 npm start
# Then run the complete browser suite:
npm run test:browser
```

`CHROMIUM_EXECUTABLE` may point the browser suite at an existing Chromium binary. Unit/API tests use an isolated temporary database and cover puzzles, Nairobi rollover, legal computer moves, special moves, account login, illegal moves, feedback validation, request origins, and private file protection. Browser tests cover separate page navigation/direct loading, enquiry handoff, mobile layout, dropdown keyboards and touch behavior, hero controls and reduced motion. Backend tests cover the retained API independently.

## Source-based PCA template comparison preview

The user-supplied `view-source_https___pcachess.com.html` on `main` is a saved
Chrome **view-source** page, not directly usable website HTML. Its line-content
cells were decoded and inspected locally. The reference file is left in `.cache`
and is not copied into the public site: it contains WordPress plugin settings,
analytics, third-party assets and form/OTP integrations that are not appropriate
for Kericho.

A separate, standalone comparison page is available at `template-preview.html`
(or `/template-preview` on the Node server). **The current six pages, stylesheet
and script remain unchanged.** Run a dedicated preview if desired:

```sh
PORT=3001 TEMPLATE_PREVIEW=1 npm start
```

In this mode `/` shows the comparison page; `/index.html` still shows the current
website, so the comparison links work normally. Without this environment flag,
`/` remains the current homepage.

The preview reconstructs the reference's burgundy `#4b0901` / olive `#505828`
colors, Nunito/Raleway typography, 80px header, 1140px content width, two-thirds
hero copy with a one-third enquiry card, centered section headings, circular
learner images, six service cards, four focus panels and a burgundy footer.
The top contact strip and decorative section dividers stay omitted, honoring
the earlier simplification request. Contact actions remain icons in the footer.
The source's actual hero settings are looped photos every **5000ms** with a
**500ms fade**; these are implemented without WordPress dependencies. The mobile
form moves below the hero photo, as in the supplied source. Photo navigation,
pause and reduced-motion support are included.

Only existing repository photographs and Kericho content are used. International
country claims become learner/community groups; award counters become learning
focuses; source-specific success stories become our real team/gallery. No free
demo offer, overseas branches, made-up metrics, unconfirmed online services,
testimonials, PCA contacts or OTP verification is copied. The enquiry form opens
WhatsApp for review/send and stores nothing. Read More links lead to the current
site's deeper pages. This is a **homepage template evaluation**, not a deployment
of PCA's WordPress backend or a claim that all reference pages are replicated.
Fonts are served locally under the licenses in `assets/template-fonts`.
