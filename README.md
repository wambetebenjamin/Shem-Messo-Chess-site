# Kericho Chess Club & Academy

## UI restored to the previous branch

The public website was restored from commit `04d18c773e4da0e8cc0a98881c6ad5b05391bbba` on `arena/1fbcaa8d-shem-messo-chess-site` (PR #22): `index.html`, `style.css`, `script.js`, and `assets/site-photos/`.

The only subsequent UI changes requested are removing the top contact strip and increasing text sizes. Its original navy/blue/white palette, fonts, hero, programs, team, merchandise and contact interface are preserved. The replacement green interface from this branch has been removed.

The backend work is retained separately, but **registration embeds, account controls, chess, feedback, FAQs, events and push opt-in are not currently exposed in this restored UI**. They must be integrated into the approved previous design without redesigning it. The backend documentation below describes the retained implementation, not features available through the current page. The restored site's enquiry form still opens WhatsApp and does not store its submissions.

## Run

Requires **Node.js 22.13 or later** (SQLite is built into Node).

```sh
npm ci
npm start
```

Open port 3000. The server binds to `0.0.0.0`; set `PORT` to change it. All browser API and Socket.IO requests are same-origin, including proxied previews.

**This is now a Node application, not a static-only site.** GitHub Pages alone cannot provide accounts, online matchmaking, feedback storage or notifications. Deploy one Node process behind an HTTPS reverse proxy with WebSocket support. Set `NODE_ENV=production` for secure session cookies. The proxy must preserve the browser Host and forward HTTPS protocol; one trusted proxy hop is assumed. Do not expose the process directly on public HTTP in production.

## Pages and content

- `/`: brief introduction and three clear next steps; no staff profiles.
- `/about`: officials' photos, titles and role descriptions. The repository identifies Shem Meso (President) and Barnabas Ochieng (Vice Chairperson). No invented qualifications, awards or additional officials were added. Have the club confirm titles/descriptions and supply other officials' names, roles, photos and approved biographies to expand this page.
- `/registration`: actual Google Forms embedded in a tabbed interface. First supplied link is **Photo and Video Consent**; second is **Academy Membership**. Summary text comes from the forms' introductory pages. Later form sections and validation are delivered directly by Google, not duplicated or guessed. A fallback new-tab link is provided for browsers blocking embeds. Contact details in the original Google Form are controlled by its owner; the site's own contact controls use icons only.
- `/events`: upcoming confirmed events from `events.json`; empty by default, without fabricated dates. Example item:

```json
{
  "title": "Replace with approved event title",
  "date": "2026-12-01",
  "location": "Replace with confirmed venue",
  "description": "Replace with approved details"
}
```

Use ISO `YYYY-MM-DD` dates. Expired events are hidden in Nairobi time. Updates are read on every request; no server restart is needed.

- `/help`: accessible expandable FAQs and private feedback submission.
- `/play`: daily mate-in-one puzzle, beginner computer play and live online matchmaking. Account login is checked on the server for computer and online games. Website play accounts do **not** grant or confirm paid academy membership.

## Storage and operations

The first run creates private `data/academy.sqlite` and `data/secrets.json`. This directory is ignored by Git and **must be on persistent private storage in production**. Back it up securely; never serve it publicly. Passwords are bcrypt hashed; sessions use HTTP-only, same-site cookies and persistent SQLite storage. Feedback and push subscriptions are also private. The VAPID private key remains on the server. Optionally set `SESSION_SECRET` and `VAPID_SUBJECT` (a valid operator contact such as `mailto:...`). Keep the same signing secrets across restarts.

Review feedback on the server:

```sh
npm run feedback
```

Feedback has no public read endpoint or admin UI. Do not share the output publicly. Set a retention policy and delete old feedback/accounts when no longer needed. Email verification and password recovery for **play accounts** are not implemented; the membership form's own verification process is separate.

## Push notifications

Visitors explicitly opt in on Events. HTTPS and browser Web Push support are required. On iOS, Web Push normally requires installing the site to the home screen. Visitors can unsubscribe in the site or browser settings. Only standard FCM, Mozilla and Apple push endpoints are accepted, preventing arbitrary server-side URL requests.

An authorised operator with server access sends updates:

```sh
npm run notify -- "Academy update" "Registration is open. Find the official form on our website." "/registration"
npm run notify -- "New event announced" "Visit our calendar for the confirmed details." "/events"
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
npm start # in a separate terminal
npm run test:browser
```

`CHROMIUM_EXECUTABLE` may point the browser suite at an existing Chromium binary. Unit/API tests use an isolated temporary database and cover puzzles, Nairobi rollover, legal computer moves, special moves, account login, illegal moves, feedback validation, request origins, and private file protection. Browser tests cover page navigation, registration embed selection, mobile width/navigation, login gating, computer moves, two-account live games and feedback.
