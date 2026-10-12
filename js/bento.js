/* =============================================================================
   BENTO · TACTICS & TRAINING CARDS
   js/bento.js

     EFFECT-24  skeleton screens (zero CLS: the placeholder occupies the exact
                footprint the real content will fill)
     EFFECT-07  looping SVG move-path arrows                (card 1)
     EFFECT-08  self-drawing notation, shared with preloader (card 2)
     EFFECT-09  morphing SVG: pin → fork → skewer            (card 3)
     EFFECT-13  cartoon knight mascot                        (card 4)
     EFFECT-14  faux-3D stacked pawn, bounded pointer tilt    (card 5)
     EFFECT-15  horizontal snap rail with parallax + keyboard (card 6)
     EFFECT-16  mixed-media collage, dimensioned lazy images  (card 7)
     EFFECT-17  liquid gooey blob, bounded filter region      (card 8)
     EFFECT-19  isometric endgame assembling on scroll        (card 9)
     EFFECT-31  stop-motion sprite sheet, steps() timing      (card 10)
   ========================================================================== */
(function () {
  "use strict";

  var KC = window.KC;
  var reduced = function () { return KC ? KC.motion.reduced : true; };
  var NS = "http://www.w3.org/2000/svg";
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* =====================================================================
     EFFECT-24 · SKELETON SCREENS
     A card stays aria-busy until its images have decoded (or 2.5s, whichever
     comes first). The skeleton is an absolutely-positioned overlay inside a
     card whose height is already fixed by CSS, so removing it cannot shift
     anything else on the page.
     ===================================================================== */
  function initSkeletons() {
    var cards = document.querySelectorAll(".card[aria-busy='true']");
    Array.prototype.forEach.call(cards, function (card) {
      var min = 380;                      /* enough to read as a placeholder */
      var max = 2500;                     /* never hold content hostage */
      var t0 = Date.now();
      var imgs = Array.prototype.slice.call(card.querySelectorAll("img"));
      var pending = imgs.filter(function (i) { return !i.complete; }).length;

      var done = false;
      function release() {
        if (done) return;
        done = true;
        card.setAttribute("aria-busy", "false");
        card.dispatchEvent(new CustomEvent("kc:cardready"));
      }
      function check() {
        if (done) return;
        var elapsed = Date.now() - t0;
        if (pending <= 0 && elapsed >= min) release();
        else if (elapsed >= max) release();
        else setTimeout(check, 60);
      }
      imgs.forEach(function (img) {
        if (img.complete) return;
        var one = function () { pending--; };
        img.addEventListener("load", one, { once: true });
        img.addEventListener("error", one, { once: true });
      });
      setTimeout(check, min);
    });
  }

  /* =====================================================================
     EFFECT-07 · LINE ANIMATION (card 1) — runs only in viewport
     ===================================================================== */
  function initLineCard() {
    var card = document.querySelector(".card-line");
    if (!card) return;
    if (KC) KC.inView(card, null, { threshold: 0.25 });
    else card.classList.add("in-view");
  }

  /* =====================================================================
     EFFECT-08 · SELF-DRAWING STROKES (card 2 + preloader reuse)
     Path length is measured at runtime, so the artwork can change freely.
     ===================================================================== */
  function initDrawCard() {
    var card = document.querySelector(".card-draw");
    if (!card) return;
    var replay = card.querySelector("[data-draw-replay]");
    var run = function () { KC ? KC.playDraw(card, 120) : null; };
    if (KC) KC.onceInView(card, run, { threshold: 0.35 });
    if (replay) {
      replay.addEventListener("click", function () {
        Array.prototype.forEach.call(card.querySelectorAll(".draw-stroke, .draw-fill"), function (el) {
          el.classList.remove("is-drawing");
        });
        void card.getBoundingClientRect();
        run();
      });
    }
  }

  /* =====================================================================
     EFFECT-09 · MORPHING SVG (card 3)
     Three tactic states share one point count, so every frame is a plain
     linear interpolation — no path parsing, no mismatch.
     Hover / focus cycles forward; mouse-out and blur return to the pin.
     ===================================================================== */
  var MORPH = [
    {
      name: "Pin",
      caption: "A pinned piece cannot move: the king behind it would fall.",
      path: [[34, 112], [78, 112], [124, 112], [176, 112]],
      nodes: [[34, 112], [96, 112], [176, 112]],
      width: 11
    },
    {
      name: "Fork",
      caption: "One knight, two targets. Black can only save one of them.",
      path: [[52, 158], [92, 112], [140, 96], [172, 138]],
      nodes: [[52, 158], [104, 70], [172, 138]],
      width: 10
    },
    {
      name: "Skewer",
      caption: "Attack through the king: it must step aside, and the rook behind is lost.",
      path: [[38, 52], [84, 92], [130, 130], [180, 166]],
      nodes: [[38, 52], [108, 108], [180, 166]],
      width: 9
    }
  ];

  function initMorphCard() {
    var card = document.querySelector(".card-morph");
    if (!card) return;
    var svg = card.querySelector(".card-morph__svg");
    var pathEl = card.querySelector("[data-morph-path]");
    var labelEl = card.querySelector("[data-morph-name]");
    var captionEl = card.querySelector("[data-morph-caption]");
    var dotWrap = card.querySelector(".morph-dots");
    if (!svg || !pathEl) return;

    var nodes = Array.prototype.slice.call(svg.querySelectorAll("[data-morph-node]"));
    var current = 0;
    var shown = MORPH[0].path.map(function (p) { return p.slice(); });
    var shownNodes = MORPH[0].nodes.map(function (p) { return p.slice(); });
    var shownWidth = MORPH[0].width;
    var raf = 0;
    var timer = 0;

    function dOf(pts) {
      return "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L ");
    }

    function paint() {
      pathEl.setAttribute("d", dOf(shown));
      pathEl.setAttribute("stroke-width", shownWidth.toFixed(1));
      nodes.forEach(function (n, i) {
        if (!shownNodes[i]) return;
        n.setAttribute("cx", shownNodes[i][0].toFixed(1));
        n.setAttribute("cy", shownNodes[i][1].toFixed(1));
      });
    }

    function setState(i) {
      current = ((i % MORPH.length) + MORPH.length) % MORPH.length;
      var s = MORPH[current];
      if (labelEl) labelEl.textContent = s.name;
      if (captionEl) captionEl.innerHTML = s.caption;
      Array.prototype.forEach.call(dotWrap ? dotWrap.children : [], function (d, n) {
        d.setAttribute("aria-pressed", n === current ? "true" : "false");
      });

      if (reduced()) {
        /* Crossfade substitute: no interpolation, just a fresh frame. */
        shown = s.path.map(function (p) { return p.slice(); });
        shownNodes = s.nodes.map(function (p) { return p.slice(); });
        shownWidth = s.width;
        svg.style.opacity = "0.35";
        paint();
        requestAnimationFrame(function () { svg.style.opacity = "1"; });
        return;
      }

      var from = shown.map(function (p) { return p.slice(); });
      var fromN = shownNodes.map(function (p) { return p.slice(); });
      var fromW = shownWidth;
      var t0 = performance.now();
      var dur = 620;
      cancelAnimationFrame(raf);
      (function step(t) {
        var k = clamp((t - t0) / dur, 0, 1);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        for (var i = 0; i < from.length; i++) {
          shown[i][0] = lerp(from[i][0], s.path[i][0], e);
          shown[i][1] = lerp(from[i][1], s.path[i][1], e);
        }
        for (var j = 0; j < fromN.length; j++) {
          shownNodes[j][0] = lerp(fromN[j][0], s.nodes[j][0], e);
          shownNodes[j][1] = lerp(fromN[j][1], s.nodes[j][1], e);
        }
        shownWidth = lerp(fromW, s.width, e);
        paint();
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }

    function cycle() {
      clearInterval(timer);
      if (reduced()) return;
      timer = setInterval(function () { setState(current + 1); }, 1700);
    }
    function stopCycle() { clearInterval(timer); }

    card.addEventListener("mouseenter", function () { setState(current + 1); cycle(); });
    card.addEventListener("mouseleave", function () { stopCycle(); setState(0); });
    card.addEventListener("focusin", function () { setState(current + 1); cycle(); });
    card.addEventListener("focusout", function (e) {
      if (card.contains(e.relatedTarget)) return;
      stopCycle(); setState(0);
    });

    if (dotWrap) {
      Array.prototype.forEach.call(dotWrap.children, function (dot, i) {
        dot.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        dot.setAttribute("aria-label", "Show the " + MORPH[i].name.toLowerCase() + " diagram");
        dot.addEventListener("click", function () { stopCycle(); setState(i); });
      });
    }

    paint();
    if (labelEl) labelEl.textContent = MORPH[0].name;
  }

  /* =====================================================================
     EFFECT-13 · CHARACTER MASCOT (card 4 + CTA band variant)
     Decorative: the whole SVG is aria-hidden. Reacts to hover and focus.
     ===================================================================== */
  function initMascots() {
    var mascots = document.querySelectorAll("[data-mascot]");
    Array.prototype.forEach.call(mascots, function (m) {
      m.setAttribute("aria-hidden", "true");
      var onScreen = true;
      var hovering = false;
      function sync() { m.classList.toggle("is-live", onScreen || hovering); }
      if (KC) KC.inView(m, function (on) { onScreen = on; sync(); }, { threshold: 0.25 });
      else sync();

      var host = m.closest(".card, .cta-band") || m;
      host.addEventListener("mouseenter", function () { hovering = true; sync(); });
      host.addEventListener("mouseleave", function () { hovering = false; sync(); });
      host.addEventListener("focusin", function () { hovering = true; sync(); });
      host.addEventListener("focusout", function (e) {
        if (host.contains(e.relatedTarget)) return;
        hovering = false; sync();
      });
    });
  }

  /* =====================================================================
     EFFECT-14 · FAUX 3D (card 5)
     Pointer-driven tilt, hard-bounded to ±10°, off entirely for coarse
     pointers and under reduced motion (which leaves the flat stack).
     ===================================================================== */
  function initFaux3D() {
    var stage = document.querySelector("[data-pawn3d]");
    if (!stage) return;
    var obj = stage.querySelector(".pawn3d");
    if (!obj) return;
    var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function move(e) {
      var r = stage.getBoundingClientRect();
      var nx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
      var ny = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
      obj.style.setProperty("--ry", (nx * 20).toFixed(2) + "deg");
      obj.style.setProperty("--rx", (-ny * 14).toFixed(2) + "deg");
    }
    function reset() {
      obj.style.setProperty("--ry", "0deg");
      obj.style.setProperty("--rx", "0deg");
    }
    if (fine && !reduced()) {
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerleave", reset);
    }
    document.addEventListener("kc:motion", function () { if (reduced()) reset(); });
  }

  /* =====================================================================
     EFFECT-15 · HORIZONTAL SNAP RAIL (card 6)
     Keyboard-scrollable, announces the visible item, parallax depth on the
     image layer. Reduced motion → wrapped grid, no snapping, no parallax.
     ===================================================================== */
  function initRail() {
    var rail = document.querySelector("[data-rail]");
    if (!rail) return;
    var count = rail.querySelectorAll(".rail__item").length;
    var meta = document.querySelector("[data-rail-meta]");
    var prev = document.querySelector("[data-rail-prev]");
    var next = document.querySelector("[data-rail-next]");

    function index() {
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var items = rail.querySelectorAll(".rail__item");
      var best = 0, bestD = Infinity;
      Array.prototype.forEach.call(items, function (it, i) {
        var c = it.offsetLeft + it.offsetWidth / 2;
        var d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    function parallax() {
      if (reduced()) return;
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      Array.prototype.forEach.call(rail.querySelectorAll(".rail__item"), function (it) {
        var layer = it.querySelector(".rail__layer");
        if (!layer) return;
        var off = (it.offsetLeft + it.offsetWidth / 2 - mid) / rail.clientWidth;
        layer.style.transform = "translate3d(" + (off * -28).toFixed(1) + "px,0,0) scale(1.14)";
      });
    }

    function report() {
      var i = index();
      if (meta) meta.textContent = (i + 1) + " of " + count;
      parallax();
    }

    var queued = false;
    rail.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; report(); });
    }, { passive: true });

    function go(dir) {
      var items = rail.querySelectorAll(".rail__item");
      var i = clamp(index() + dir, 0, items.length - 1);
      var it = items[i];
      if (!it) return;
      rail.scrollTo({
        left: it.offsetLeft - (rail.clientWidth - it.offsetWidth) / 2,
        behavior: reduced() ? "auto" : "smooth"
      });
      /* Focus follows, so keyboard users can act on the item they landed on. */
      var link = it.querySelector("a, button");
      if (link) setTimeout(function () { link.focus({ preventScroll: true }); }, reduced() ? 0 : 420);
    }

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });

    rail.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "Home") { e.preventDefault(); go(-99); }
      else if (e.key === "End") { e.preventDefault(); go(99); }
    });

    report();
    window.addEventListener("resize", report);
  }

  /* =====================================================================
     EFFECT-17 · LIQUID GOO (card 8 + 404 reuse)
     The filter region is bounded so the blur never bleeds across the card.
     ===================================================================== */
  function initGoo() {
    var cards = document.querySelectorAll(".card-goo");
    Array.prototype.forEach.call(cards, function (c) {
      if (KC) KC.inView(c, null, { threshold: 0.2 });
      else c.classList.add("in-view");
    });
  }

  /* =====================================================================
     EFFECT-19 · ISOMETRIC ASSEMBLY (card 9)
     True 120° axes: x = (+0.866, +0.5)·s, y = (−0.866, +0.5)·s, z is
     vertical. No perspective transform anywhere, so nothing converges.
     ===================================================================== */
  function isoGeometry(s, cx, cy) {
    var ux = 0.8660254 * s, uy = 0.5 * s;
    function P(f, r, h) {
      return [cx + (f - r) * ux, cy + (f + r) * uy - (h || 0)];
    }
    function tile(f, r) {
      return [P(f, r), P(f + 1, r), P(f + 1, r + 1), P(f, r + 1)];
    }
    function poly(pts) {
      return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    }
    function prism(f, r, h, k, cls, dark) {
      /* k shrinks the footprint toward the tile centre (a tapered piece). */
      var c = P(f + 0.5, r + 0.5, 0);
      var corners = tile(f, r).map(function (p) {
        return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k];
      });
      var top = corners.map(function (p) { return [p[0], p[1] - h]; });
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", cls || "");
      var face = function (base) { return dark ? base + " " + base + "--b" : base; };
      var mk = function (pts, cls2) {
        var el = document.createElementNS(NS, "polygon");
        el.setAttribute("points", poly(pts));
        el.setAttribute("class", cls2);
        return el;
      };
      /* back-to-front: the two visible faces, then the top. */
      g.appendChild(mk([top[3], top[2], corners[2], corners[3]], face("iso__left")));
      g.appendChild(mk([top[1], top[2], corners[2], corners[1]], face("iso__right")));
      g.appendChild(mk(top, face("iso__top")));
      return g;
    }
    return { P: P, tile: tile, poly: poly, prism: prism };
  }

  function initIsometric() {
    var card = document.querySelector(".card-iso");
    if (!card) return;
    var svg = card.querySelector(".card-iso__svg");
    if (!svg) return;

    var W = 340, H = 260, s = 24;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "Isometric endgame diagram: a white rook and white king closing on a lone black king. " +
      "The scene assembles piece by piece as you scroll.");

    var iso = isoGeometry(s, W / 2, 46);
    var board = document.createElementNS(NS, "g");
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var t = document.createElementNS(NS, "polygon");
        t.setAttribute("points", iso.poly(iso.tile(f, r)));
        t.setAttribute("class", "iso__tile" + ((f + r) % 2 ? " iso__tile--dark" : ""));
        board.appendChild(t);
      }
    }
    svg.appendChild(board);

    /* Endgame: white rook a1, white king e2, lone black king e8.
       Coordinates are (file, rank-from-top). */
    var rook = iso.prism(0.6, 6.6, 44, 0.58, "iso__piece", false);
    var wking = iso.prism(4.2, 5.4, 52, 0.5, "iso__piece", false);
    var bking = iso.prism(4.2, 0.6, 52, 0.5, "iso__piece", true);

    svg.appendChild(rook);
    svg.appendChild(wking);
    svg.appendChild(bking);

    var pieces = [rook, wking, bking];
    var card_ = card;
    function progress() {
      var rect = card_.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      /* 0 when the card's top enters, 1 when its middle passes the centre. */
      var p = (vh * 0.85 - rect.top) / (rect.height + vh * 0.25);
      return clamp(p, 0, 1);
    }
    function apply() {
      if (reduced()) {
        pieces.forEach(function (p) { p.classList.add("is-placed"); });
        return;
      }
      var p = progress();
      pieces.forEach(function (el, i) {
        var at = 0.25 + i * 0.22;
        el.classList.toggle("is-placed", p >= at);
      });
    }
    var queued = false;
    window.addEventListener("scroll", function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; apply(); });
    }, { passive: true });
    window.addEventListener("resize", apply);
    if (KC) KC.onceInView(card, apply, { threshold: 0.15 });
    apply();
  }

  /* =====================================================================
     EFFECT-31 · STOP-MOTION SPRITE (card 10)
     8-frame sheet at ~10fps via steps(). Halts off-screen; rests on the
     mid frame under reduced motion.
     ===================================================================== */
  function initSprite() {
    var card = document.querySelector(".card-sprite");
    if (!card) return;
    if (KC) KC.inView(card, null, { threshold: 0.25 });
    else card.classList.add("in-view");
  }

  /* =====================================================================
     EFFECT-16 · MIXED MEDIA (card 7) — nothing beyond lazy dimensioned
     images and a pointer-driven vector overlay, both handled in CSS.
     ===================================================================== */

  /* --------------------------------------------------------------------- */
  function init() {
    initSkeletons();
    initLineCard();
    initDrawCard();
    initMorphCard();
    initMascots();
    initFaux3D();
    initRail();
    initGoo();
    initIsometric();
    initSprite();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
