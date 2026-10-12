# Effects inventory

Every animation on this site exists because it does a job on a chess site. This file
lists each one, where it lives, the use case it serves, and what happens when
`prefers-reduced-motion: reduce` is set or the visitor turns motion off with the
header toggle.

Motion is switched off in exactly one place. `js/effects.js` keeps three gates, and
every effect inherits all of them:

| Gate | Set by | Effect |
| --- | --- | --- |
| `html[data-motion="reduced"]` | the OS setting **or** the header toggle (persisted in `localStorage`) | freezes movement; substitutes opacity / colour / a static frame |
| `body[data-paused="true"]` | tab hidden, page hidden | pauses the looping animations that are listed in `css/effects.css` |
| `KC.inView()` | IntersectionObserver | an effect only animates while its own element is on screen |

There is also a media-query backstop in `css/effects.css` so the page is calm before
JavaScript runs at all.

---

## Hero

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 04 | Expressive typography | `index.html` `h1`, split by `js/effects.js` | The headline lands letter by letter; the key term **Checkmate** glitches so the eye stops on the point of the page | Letters appear at once; the key term keeps its amber colour and the two ghost layers are removed with `content: none` |
| 23 | Hero sequence | `.hero.is-ready` | Eyebrow → headline → sub-copy → CTA → board over 1.6s so the page reads in one order | No sequence; everything is present |
| 01 | Real-time rendering | `js/hero3d.js` (Three.js r149, `js/vendor/three.min.js`) | Orbit a real 3D board showing the Ruy López before committing to the playable board. Poster image (`assets/hero-dark-board.jpg`) is both the fallback and the frame shown until the first WebGL frame | One frame is rendered and the loop stops — the position stays fully visible, it just does not turn |
| 18 | Animated gradient | `.hero__gradient` | Slow dark-blue → deep-purple drift behind the hero. Only `background-position` animates | Held at one position |
| 06 | Ambient motion | `js/effects.js`, `#ambient` | Chess-piece silhouettes drift behind the whole site at ≤0.22 opacity | One static frame at 0.14 opacity |

Accessibility notes for the hero:

- the split headline keeps **one `.sr-only` copy** of the clean sentence, so a screen
  reader reads "Master Chess. Learn Tactics. Checkmate." and never hears letters
- the 3D canvas is `role="img"` with a text description of the position and an
  `aria-describedby` block explaining the controls; every orbit action is *also* a
  real `<button>` in the HUD, and the canvas takes arrow keys
- the CTA is never `visibility: hidden`, never `disabled`, and never covered — it
  animates from `opacity: 0` and is focusable from the first frame

Contrast on the gradient was checked at both extremes (see the header comment in
`css/effects.css`). The one pair below 7:1 is `--brand` on the purple extreme, so
brand blue is used for large text and icons only, never for body copy over the
gradient. A scrim (`.hero__veil`) sits between the gradient and the text.

---

## Navigation and header

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 10 | Animated logo | `.crest-draw`, `data-crest` | The crest draws itself once on first view and replays on click, so the brand has a moment | Crest is simply filled and present |
| 11 | Animated icons | `.icon-btn` | Nav icons answer hover, `:focus-visible` and click in 180–280ms so the bar feels physical | Colour and background change only |
| 28 | Glassmorphic panel | `.nav.is-stuck` | The sticky nav frosts over on scroll so content scrolling under it stays legible | Same panel, no transition |
| 12 | Microinteractions | `.btn`, `.toggle`, `.icon-btn` | Hover → active → focus states on every control; toggles carry `aria-pressed` | 1ms transitions, no scaling |

The frosted panel is drawn with `@supports`: a solid navy fallback first, blur layered
on top only where `backdrop-filter` exists, and a fully opaque navy for browsers
without it — so the bar is never translucent-on-translucent. Focus rings are drawn as
`box-shadow: 0 0 0 3px dark, 0 0 0 6px amber` inside the nav, so they stay visible on
top of the blur.

---

## Game replay (scrollytelling chapter)

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 02 | Scrollytelling | `#replay`, `js/replay.js` | Teach the Opera Game (Morphy, Paris 1858) in four beats — Opening, Middlegame, Tactics, Finish — without hosting video | Beats stack as a plain article, all fully opaque; the board still tracks scroll, it just changes instantly |
| 20 | Section backdrops | `.beat-bg`, built by `js/replay.js` | Each beat gets its own animated chessboard-pattern backdrop, tinted to the chapter colour | First frame only, at 0.5 opacity |
| 26 | Hover reveals | `.movecard` | Sidebar move cards reveal the coach's note and the eval bar | Note is always expanded |

The scroll handler is `{ passive: true }` and only *reads* position — wheel speed is
never intercepted or eased. Each beat maps to a ply range, so the board and the text
can never disagree.

---

## Tactics gallery (bento grid)

| # | Effect | Card | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 07 | Line animation | 1 | Arrows trace the route a coach draws on a club board; the flow shows direction of travel | Static arrow, dash pattern removed |
| 08 | Self-drawing strokes | 2 | Notation drawn the way a coach writes it. Path length is measured with `getTotalLength()` at runtime | Finished frame, no draw |
| 09 | Morphing SVG | 3 | Pin → fork → skewer with matched point counts, so the interpolation is exact | Crossfade between the three frames |
| 13 | Character mascot | 4 | A friendly knight reacts to hover/focus; a waving variant sits in the CTA band | Static pose |
| 14 | Faux 3D | 5 | Stacked layers show a pawn's geometry from several angles at once; pointer tilt is bounded to ±10° | Flat silhouette |
| 15 | Horizontal scroll rail | 6 | Eight club puzzle positions, snap-scrolled with parallax depth | Wrapped grid, no snapping, no parallax |
| 16 | Mixed media | 7 | Real board photography with vector piece overlays and an `aria-hidden` grain layer | Static composition |
| 17 | Liquid gooey blob | 8 | One position dissolving into the next; the filter region is bounded so the blur never leaves the card | Static merged shape |
| 19 | Isometric assembly | 9 | King + rook vs. lone king, assembled piece by piece on scroll on true 120° axes | Fully assembled |
| 31 | Stop-motion sprite | 10 | An eight-frame capture sequence at ~10fps via `steps(8, jump-none)` | Rests on the impact frame |
| 24 | Skeleton screens | all ten | Shimmer placeholders while images decode | Static placeholders, same footprint |

Two details worth knowing:

- **EFFECT-08 is shared.** The preloader uses the same `.draw-stroke` component as
  card 2, and both measure their own path length at runtime.
- **EFFECT-24 cannot shift layout.** The skeleton is an absolutely-positioned overlay
  inside a card whose height is already fixed by CSS, and every image carries
  `width`/`height`, so removing the placeholder moves nothing.

---

## Live multiplayer / presence

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 05 | Collaborative presence | `#live`, `js/presence.js` | During a live broadcast, spectators see each other's pointers and reactions, which is the difference between a diagram and a game other people are following | Reactions cross-fade instead of flying |
| 12 | Microinteractions | `.reactions` | Reaction buttons animate on click, each with its own `aria-label` | Colour change only |

Transport behaviour:

1. the page probes `presence-health` once; a static host (GitHub Pages, S3) answers
   404 and the room falls back **immediately** instead of retrying
2. with a socket server present (`node server/server.js`, zero dependencies) peers
   sync over WebSockets with exponential-backoff reconnect
3. with no server, the room falls back to a `BroadcastChannel`, so two tabs on the
   same device still see each other
4. a lone visitor is told plainly, in the live region, that they are the only one here

Your own pointer is painted optimistically, before any network round trip.

---

## Player profile / social

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 26 | Hover reveals | `.player` | Avatar cards reveal rating, recent form and the follow button | Panel always open |
| 13 | Mascot variant | CTA band | The waving knight invites people to bring a friend | Static pose |
| 12 | Microinteractions | follow buttons | State change on press, with `aria-pressed` | Colour change only |

Hover reveals have a touch equivalent: on `(hover: none)` the first tap opens the
panel and moves focus into it, and `Escape` closes it.

---

## Loading and transitions

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 25 | Preloader | `#preloader`, `js/effects.js` | Branded boot sequence that reuses the self-drawing stroke | Plain percentage text, no draw |
| 22 | Page transitions | `css/sections.css` + `KC.swap()` | Smooth replay → analysis-board swap, and cross-document transitions when supported | 1ms / none |

The preloader blocks for **at most 2 seconds**. A skip button is injected at 3s purely
as a safety net if an asset hangs; under normal conditions it never appears. Progress
is exposed as a real `role="progressbar"`, and completion is announced through
`role="status"`.

Page transitions use the View Transitions API where it exists (`@view-transition`
for navigation, `document.startViewTransition` for the in-page swap); elsewhere the
shell fades for 240ms. The replay board and the analysis board share
`view-transition-name: board-swap` so the board morphs between the two states. After
any swap, focus moves to the new heading and the change is announced.

---

## 404

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 17 | Gooey blob | `404.html` | The spill motif from card 8 plays across the page as a playful "oops" | Static spill |
| 06 | Ambient particles | `404.html` | Same drifting piece silhouettes as the home page | One static frame |

---

## Advanced: tournament broadcast

| # | Effect | Where | Use case | Reduced motion |
| --- | --- | --- | --- | --- |
| 03 | AR option | `#broadcast`, `js/ar.js` | Opt-in "View in AR" places board 1 in the room at floor level; the 360° preview is the default everywhere else | No change — AR is a single placement, not motion |

The button stays `disabled` until `navigator.xr.isSessionSupported('immersive-ar')`
resolves true, and nothing is requested until it is pressed. The exit control is a
real, always-focusable `<button>` that ends the session; `Escape` does the same.

---

## Validation checklist

| Requirement | How it is met |
| --- | --- |
| Every animation has a clear chess use case | The "Use case" column above; none are decorative-only |
| `prefers-reduced-motion` disables or substitutes all animations | Three gates (attribute, media query, pause) plus the "Reduced motion" column above |
| No content blocked by loaders; preloader skippable after 3s | 2s hard ceiling on the preloader; skip button injected at 3s; `<noscript>` hides it entirely |
| All ARIA labels present; screen readers read clean unsplit text | Split text keeps one `.sr-only` copy; decorative art is `aria-hidden`; meaningful SVGs are `role="img"` with a label; loaders carry `aria-busy` and `role="status"` |
| Skeleton placeholders match final dimensions (zero CLS) | Skeletons are absolute overlays in fixed-height cards; every image has `width`/`height` |
| Animations run only in viewport | `KC.inView()` / `KC.onceInView()` gate every looping effect |
| Focus rings visible over blur and glass | Double-ring `box-shadow` inside `.nav` and any `.on-glass` container |
| Touch devices get tap equivalents for hover reveals | `[data-tap-reveal]` delegation on `(hover: none)`, with `Escape` to close |
| All photos from the repository, no people portraits | Only board, venue, clock and materials photography from `assets/` is used; no portrait files are referenced |
| Contrast verified on animated gradients at all extremes | Ratios recorded in the header of `css/effects.css`; sub-7:1 pairs restricted to large text and icons |
| WebGL canvases have poster fallbacks | `assets/hero-dark-board.jpg` behind `#ambient`-free `.board3d`, plus a written note when WebGL is missing |
| Background motion pauses when the tab is hidden | `visibilitychange` → `body[data-paused="true"]` → `animation-play-state: paused` and the rAF loop stops |
