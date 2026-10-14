# Kericho Chess Club & Academy

A shorter public website in the approved navy/blue/white design, with real registration interfaces, private feedback, optional browser push, and login-required computer/online chess. The supplied PCA source-inspired homepage remains a separate comparison, not a replacement of the approved design.

## Public pages

- **Home (`index.html`)**: existing automatic hero, values strip, brief welcome and four compact shortcuts to Registration, Play/Daily Puzzle, Events, and FAQs/Feedback. No officials’ portraits, profiles or staff carousel on Home.
- **About Us (`about.html`)**: immediately after Home in every main navigation. All five existing officials/team profiles and photographs are here. Only the confirmed President and Vice Chairperson roles are named; other responsibilities remain unconfirmed. The existing portrait carousel now lives here, with its original four-second autoplay, controls and reduced-motion behavior.
- **Programs (`programs.html`)**, **Merchandise (`merchandise.html`)**, **Contact (`contact.html`)**: existing detail pages, enquiries and photographs retained.
- **Registration (`registration.html`)**: a four-step guided joining experience with a welcome screen, self/child path cards, a keyboard-accessible progress navigation, contextual membership/consent guidance, back/continue controls, explicit official-form embeds, next-step summaries and optional push controls.
- **Events (`events.html`)**: confirmed upcoming events from `events.json`, safe text rendering, clear empty/error states and optional push controls.
- **FAQs & Feedback (`help.html`)**: native expandable FAQs and a feedback form writing to private server storage. No public feedback feed.
- **Play (`play.html`)**: account creation/login/logout, beginner computer practice, online matchmaking, legal interactive boards with keyboard navigation and promotion choice, move history, and a daily puzzle available without login.
- **Legacy Team (`team.html`)** redirects to `about.html#officials` on Node; a static meta-refresh and fallback link do the same on static hosts.

The Community dropdown exposes Registration, Events, Play, Daily Puzzle and Help without crowding the main header. Footer contacts use call/email/WhatsApp icons rather than displaying contact details. Existing photographs are unchanged. The primary hero continues rotating every four seconds without hover interruption.

## Run locally or deploy the full website

Requires **Node.js 22.13+** (built-in SQLite), npm, and persistent private storage for the backend.

```sh
npm ci
npm start
```

The server binds to `0.0.0.0`, with `PORT=3000` by default. All browser API, Socket.IO and service-worker requests are same-origin; no browser-facing localhost backend URL is hardcoded. Use one Node process in production for shared matchmaking/game state. Configure your reverse proxy for HTTP, Socket.IO polling and WebSocket upgrades. `NODE_ENV=production` enables secure cookies; deploy behind HTTPS with the configured trusted proxy. Keep private signing keys stable across restarts.

**GitHub Pages is static-only.** It can display public information and the supplied Google Form interfaces, but cannot run accounts, chess/puzzle APIs, feedback storage, event APIs or Web Push subscription storage. The UI reports this limitation rather than claiming success. Those features need the Node service on the same origin. This branch/PR is not automatically a production deployment.

## Registration and consent

Official forms supplied by the club:

- Membership: `https://docs.google.com/forms/d/e/1FAIpQLSdbieIfMBN_VQPdNGKFHh1rPMa_JFpRZUUhkHEEU92DbUgJGw/viewform`
- Photo/video consent: `https://docs.google.com/forms/d/e/1FAIpQLSefyh1CBlzc_YsCPh9dp8oNl9dcBPjr4cNvjET8ob4ndaodzw/viewform`

Their published introductions were inspected. The membership form describes email verification, fees shown at checkout, inactive membership until paid, issuance of a membership ID after processing, and a paid term ending 31 December 2026. No fee amount, payment processing, membership activation or email verification is fabricated on this website. Confirm current terms with the club; update the page if the supplied form changes.

The consent introduction asks for one form per child, distinguishes internal/publicity use and separate permission to identify children by name, and describes review/withdrawal in writing and limits on recalling printed/third-party material. The embedded official forms retain their own downstream fields, validation and consent choices; later sections were not independently extracted.

The guide asks only who is joining (self or child) to tailor its advice. It does not collect duplicate personal details or save that choice in cookies/localStorage/sessionStorage. Progress means a step has been opened, not a verified submission. Back/continue keeps loaded iframes mounted; restarting warns before clearing unsubmitted iframe work. The final screen explicitly says it is not a membership confirmation.

Google processes these forms. Loading is explicit to avoid unnecessary third-party requests. Cross-origin iframe submissions cannot be inspected by this website, so it does not mark forms complete or send automatic submission notifications. Sign-in, cookie restrictions or blocked embedding may require the always-available external link. No live membership/consent submission was made during testing. Play accounts are separate from academy membership.

## Events and push notifications

`events.json` is initially `[]`: no unconfirmed dates are invented. An operator can add confirmed entries:

```json
[
  {
    "title": "Confirmed event title",
    "date": "YYYY-MM-DD",
    "location": "Confirmed venue",
    "description": "Confirmed details"
  }
]
```

Replace the placeholders with confirmed information; do not publish this example literally. `/api/events` excludes past dates in `Africa/Nairobi`; the interface sorts and formats dates in Nairobi time.

Push is an explicit opt-in on Registration/Events, with on-device unsubscribe controls. Merely loading a page does not prompt for permission or register a worker. HTTPS and browser support are required; iOS may require home-screen installation. Stored endpoints are private, restricted to standard browser push providers. A failed new subscription save is rolled back on the device.

An authorized operator with server access sends announcements:

```sh
npm run notify -- "Academy update" "Contact the academy for confirmed details." "/events.html"
```

Editing events does not automatically send announcements. Google Form completion does not trigger push notifications. Real delivery needs outbound access to browser push providers; Arena restricts those hosts. Opt-in/out wiring is covered using a mock browser subscription, **not a claim of verified real-device delivery**.

## Accounts, chess and privacy

Passwords are bcrypt hashed. Sessions use persistent SQLite, HTTP-only same-site cookies and regeneration on login. Computer and online play require server-side authentication. Socket connections require same-origin browser metadata or a matching Origin; anonymous/foreign-origin connections are rejected. Registration/login/feedback/subscription endpoints are rate-limited. No passwords or session tokens are saved to localStorage or placed in URL parameters.

- Computer: legal moves with a simple capture/reply heuristic, **not Stockfish**; White is the human player.
- Online: distinct signed-in accounts select matchmaking on the same server. Untimed, casual games; leaving/disconnecting ends the game. Use one active game tab per player. Games/computer positions live in memory and are lost on restart. No ratings, clocks or reconnection/resumption are claimed.
- Daily puzzle: three reviewed mate-in-one positions rotate at midnight in Nairobi. Puzzle play does not require login; expand the reviewed collection in `lib/chess.js` for more variety.
- Play-account email verification and automatic password recovery are not implemented. Use nicknames; parents/guardians should help juniors set up accounts. Never put children’s full names or sensitive details in feedback.

First run creates `data/academy.sqlite` and `data/secrets.json`. These are Git-ignored and must live on **persistent private storage** in production; back them up securely and never serve them publicly. Optional environment values: `SESSION_SECRET`, `VAPID_SUBJECT`. Feedback, play accounts, sessions and push subscriptions are stored privately; Google Form submissions stay with Google/the form owner, not this database. Establish a retention policy and a process for deletion/consent withdrawal before production use.

Review private feedback as an authorized operator:

```sh
npm run feedback
```

There is no public read endpoint or admin dashboard. Feedback does not collect email, so use Contact for enquiries needing a reply.

## Independent supplied-template comparison

`template-preview.html` follows the user-supplied saved `view-source_https___pcachess.com.html` on `main`. The Chrome view-source wrapper was decoded and inspected locally, not shipped as executable WordPress code. Local Nunito/Raleway fonts, burgundy/olive colors, a boxed layout, enquiry card and source-configured two-photo hero (5000ms loop / 500ms fade) remain. Only existing Kericho photos and relevant content are used; no PCA contacts, tracking, OTP/backend, unverified overseas claims, awards or free-demo offers are imported.

The comparison homepage is also shortened: welcome, three existing program summaries and community shortcuts. Officials remain on About Us; top contact strip and decorative section dividers remain omitted. Its enquiry opens Kericho WhatsApp for review/send and stores nothing. Links to detail pages use the approved existing design. Font licenses/provenance are in `assets/template-fonts/`.

```sh
PORT=3001 TEMPLATE_PREVIEW=1 npm start
```

On this comparison server, `/` opens the template and `/index.html` opens the current homepage. On the default server, `/` remains the current homepage; `/template-preview.html` is also available. This is a homepage comparison, not an assertion that every PCA page/backend was replicated.

## Merchandise presentation and shared actions

The merchandise catalogue displays source-derived clothing cutouts beside the existing equipment photos: short names, useful one-to-two-sentence descriptions and enquiry links, not technical labels or long descriptions. The rejected volumetric viewers and their runtime have been removed. The original supplied clothing and print artwork are retained; only the surrounding image background is masked.

Category filters, an accessible quick-look dialog with previous/next browsing, enlarged photographs and shareable item links make browsing interactive. Product enquiries retain their context. Native sharing/clipboard success is reported only after it completes; unavailable sharing offers a selectable link instead. Controls progressively enhance the page without hiding static descriptions or enquiry links.

A brief fold/swipe-return effect is staggered between visible items. It pauses for inspection, keyboard focus, explicit pause, reduced motion, hidden tabs and offscreen views. Horizontal gestures can trigger the effect; vertical scrolling and pinch zoom remain available. Photos and ordinary navigation remain visible without JavaScript. All six enquiry buttons carry the correct item into Contact. No unconfirmed prices, sizes or stock guarantees are introduced. See `assets/clothing/README.md` for source provenance.

Shared footers now have compact Join/Play/Events shortcuts, grouped Explore links, larger contact/social touch areas and keyboard focus treatment. CTA lift/arrow feedback is restrained and disabled for reduced motion. Existing colors, contact-icon-only presentation, verified social handles, homepage structure and hero/staff timing remain unchanged.

## Verification

```sh
npm test
npx playwright install chromium
# Start the default server and, in another terminal, the comparison server above.
npm run test:browser
```

`CHROMIUM_EXECUTABLE` can point to an existing Chromium binary. Browser coverage includes original photo hashes, retained hero/dropdown controls, relocation of staff portraits, navigation/anchors/no-JS fallbacks, 320–1440px layouts, registration embeds (external requests mocked/blocked, no submissions), feedback success/failure, safe event rendering, account sessions and legal computer moves, two real isolated browser accounts matching and exchanging online moves, anonymous/foreign-origin socket rejection, daily puzzle solving, static-host error messages, and mocked push opt-in/out/rollback. Unit/API tests cover protected endpoints, password login, private file protection and chess rules including special moves and Nairobi rollover.
