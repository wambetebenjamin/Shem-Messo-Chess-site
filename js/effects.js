/* =============================================================================
   KERICHO CHESS CLUB & ACADEMY · EFFECTS RUNTIME (core)
   js/effects.js

   One shared controller for the whole effects layer. Everything registers
   through it, so motion is switched off in exactly one place and every
   animation inherits the same three gates:

     KC.motion.reduced  → freeze (user toggle or OS prefers-reduced-motion)
     KC.paused          → pause (tab hidden)
     KC.inView()        → only animate while the element is on screen

   Modules in this file
     · motion + pause + viewport + rAF registry
     · EFFECT-25 preloader (reuses the EFFECT-08 self-drawing stroke)
     · EFFECT-08 self-drawing strokes (shared component)
     · EFFECT-06 ambient chess-piece particles
     · EFFECT-10 animated crest logo
     · EFFECT-11 animated nav icons
     · EFFECT-28 glassmorphic sticky nav
     · EFFECT-04 expressive typography + glitch
     · EFFECT-23 hero entrance sequence
     · EFFECT-26 hover-reveal tap equivalents
     · EFFECT-12 generic microinteraction / aria-pressed wiring
     · EFFECT-22 page transitions

   Exposed as window.KC for the sibling modules (hero3d, replay, bento,
   presence, ar).
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var STORE_KEY = "kc-motion";

  /* ---------------------------------------------------------------------
     MOTION STATE
     --------------------------------------------------------------------- */
  var stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }

  var KC = {
    motion: { reduced: stored ? stored === "reduced" : !!(mq && mq.matches) },
    paused: false,
    loops: [],
    rafId: 0,
    lastT: 0
  };

  function applyMotion() {
    root.setAttribute("data-motion", KC.motion.reduced ? "reduced" : "full");
    var btn = document.querySelector("[data-toggle-motion]");
    if (btn) {
      btn.setAttribute("aria-pressed", KC.motion.reduced ? "true" : "false");
      var label = btn.querySelector("[data-toggle-motion-label]");
      if (label) label.textContent = KC.motion.reduced ? "Motion off" : "Motion on";
    }
    if (KC.motion.reduced) stopLoops();
    else startLoops();
    document.dispatchEvent(new CustomEvent("kc:motion", { detail: { reduced: KC.motion.reduced } }));
  }

  KC.setMotion = function (reduced, remember) {
    KC.motion.reduced = !!reduced;
    if (remember) { try { localStorage.setItem(STORE_KEY, reduced ? "reduced" : "full"); } catch (e) {} }
    applyMotion();
  };

  if (mq) {
    var onMq = function () {
      var saved = null;
      try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
      if (saved) return; /* an explicit user choice wins over the OS setting */
      KC.motion.reduced = mq.matches;
      applyMotion();
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------------------------------------------------------------------
     PAUSE: tab visibility
     --------------------------------------------------------------------- */
  function setPaused(p) {
    KC.paused = !!p;
    body.setAttribute("data-paused", KC.paused ? "true" : "false");
    if (KC.paused || KC.motion.reduced) stopLoops();
    else startLoops();
  }
  document.addEventListener("visibilitychange", function () { setPaused(document.hidden); });
  window.addEventListener("pagehide", function () { setPaused(true); });
  window.addEventListener("pageshow", function () { setPaused(document.hidden); });

  /* ---------------------------------------------------------------------
     rAF REGISTRY — one loop for every canvas/particle/parallax effect
     --------------------------------------------------------------------- */
  function tick(t) {
    KC.rafId = requestAnimationFrame(tick);
    var dt = KC.lastT ? Math.min(t - KC.lastT, 64) : 16;
    KC.lastT = t;
    for (var i = 0; i < KC.loops.length; i++) {
      try { KC.loops[i](dt, t); } catch (e) { /* one bad effect must not kill the rest */ }
    }
  }
  function startLoops() {
    if (KC.rafId || !KC.loops.length || KC.motion.reduced || KC.paused) return;
    KC.lastT = 0;
    KC.rafId = requestAnimationFrame(tick);
  }
  function stopLoops() {
    if (KC.rafId) { cancelAnimationFrame(KC.rafId); KC.rafId = 0; }
  }
  KC.loop = function (fn) {
    KC.loops.push(fn);
    startLoops();
    return function () {
      var i = KC.loops.indexOf(fn);
      if (i > -1) KC.loops.splice(i, 1);
    };
  };

  /* ---------------------------------------------------------------------
     VIEWPORT GATE — IntersectionObserver
     --------------------------------------------------------------------- */
  var hasIO = "IntersectionObserver" in window;
  KC.inView = function (el, cb, opts) {
    opts = opts || {};
    var cls = opts.className || "in-view";
    if (!hasIO) { el.classList.add(cls); if (cb) cb(true); return function () {}; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var on = entries[i].isIntersecting;
        el.classList.toggle(cls, on);
        if (cb) cb(on, entries[i]);
      }
    }, { rootMargin: opts.rootMargin || "120px 0px", threshold: opts.threshold || 0.18 });
    io.observe(el);
    return function () { io.disconnect(); };
  };
  KC.onceInView = function (el, cb, opts) {
    opts = opts || {};
    var cls = opts.className || "in-view";
    if (!hasIO) { el.classList.add(cls); cb(el); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        el.classList.add(cls);
        io.disconnect();
        cb(el);
      }
    }, { rootMargin: opts.rootMargin || "0px 0px -8% 0px", threshold: opts.threshold || 0.25 });
    io.observe(el);
  };

  /* ---------------------------------------------------------------------
     EFFECT-08 · SELF-DRAWING STROKES
     Measures each path at runtime — nothing is hard-coded — and is shared by
     the preloader, bento card 2 and any element carrying [data-draw].
     --------------------------------------------------------------------- */
  KC.prepareDraw = function (scope) {
    var paths = (scope || document).querySelectorAll(".draw-stroke");
    Array.prototype.forEach.call(paths, function (p) {
      if (p.dataset.len) return;
      var len = 1000;
      try { len = Math.ceil(p.getTotalLength()); } catch (e) { len = 1000; }
      p.style.setProperty("--len", len);
      p.dataset.len = len;
    });
  };
  KC.playDraw = function (scope, delay) {
    var scopeEl = scope || document;
    KC.prepareDraw(scopeEl);
    var strokes = scopeEl.querySelectorAll(".draw-stroke");
    var fills = scopeEl.querySelectorAll(".draw-fill");
    var wait = delay || 0;
    window.setTimeout(function () {
      Array.prototype.forEach.call(strokes, function (p, i) {
        p.style.animationDelay = (i * 180) + "ms";
        p.classList.add("is-drawing");
      });
      Array.prototype.forEach.call(fills, function (f) { f.classList.add("is-drawing"); });
    }, KC.motion.reduced ? 0 : wait);
  };

  /* ---------------------------------------------------------------------
     EFFECT-25 · PRELOADER
     Never blocks content for more than 2s. A skip control is injected at 3s
     purely as a safety net if an asset hangs. Completion is announced
     through role="status".
     --------------------------------------------------------------------- */
  function bootPreloader() {
    var el = document.getElementById("preloader");
    if (!el) return finishBoot();

    var fill = el.querySelector(".preloader__fill");
    var pct = el.querySelector(".preloader__pct");
    var bar = el.querySelector(".preloader__track");
    var status = document.getElementById("bootStatus");
    var mark = el.querySelector(".draw-stroke");
    var done = false;
    var progress = 0;

    KC.prepareDraw(el);
    if (mark && !KC.motion.reduced) {
      window.setTimeout(function () { mark.classList.add("is-drawing"); }, 60);
    }

    if (bar) {
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      bar.setAttribute("aria-label", "Page loading");
    }

    function paint() {
      if (fill) fill.style.width = progress + "%";
      if (bar) bar.setAttribute("aria-valuenow", String(Math.round(progress)));
      /* Reduced motion: plain percentage text instead of the drawing mark. */
      if (pct) pct.textContent = Math.round(progress) + "%";
    }

    /* Creep toward 92% while the page is genuinely loading. */
    var creep = window.setInterval(function () {
      progress = Math.min(92, progress + 7 + Math.random() * 9);
      paint();
    }, 160);

    function finish() {
      if (done) return;
      done = true;
      window.clearInterval(creep);
      progress = 100;
      paint();
      el.classList.add("is-done");
      el.setAttribute("aria-busy", "false");
      window.setTimeout(function () { el.hidden = true; }, KC.motion.reduced ? 0 : 340);
      if (status) status.textContent = "Site ready.";
      document.dispatchEvent(new CustomEvent("kc:booted"));
    }

    /* Hard ceiling: 2s. Content is never held hostage by a slow asset. */
    window.setTimeout(finish, 2000);
    if (document.readyState === "complete") window.setTimeout(finish, 420);
    else window.addEventListener("load", function () { window.setTimeout(finish, 220); });

    /* Safety net at 3s. */
    window.setTimeout(function () {
      if (el.hidden || el.classList.contains("is-done")) return;
      var skip = el.querySelector(".preloader__skip");
      if (skip) { skip.hidden = false; skip.focus({ preventScroll: true }); }
    }, 3000);

    var skipBtn = el.querySelector(".preloader__skip");
    if (skipBtn) {
      skipBtn.addEventListener("click", function () {
        finish();
        var main = document.getElementById("main");
        if (main) main.focus({ preventScroll: true });
      });
    }

    paint();
    return finish;
  }

  function finishBoot() { document.dispatchEvent(new CustomEvent("kc:booted")); }

  /* ---------------------------------------------------------------------
     EFFECT-06 · AMBIENT MOTION
     Site-wide drift of chess-piece silhouettes, alpha capped well below
     0.25, paused when the tab is hidden, one static frame under reduced
     motion. Purely decorative → the canvas is aria-hidden.
     --------------------------------------------------------------------- */
  var SIL = {
    pawn: function (c, s) {
      c.beginPath();
      c.arc(0, -0.55 * s, 0.19 * s, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(-0.1 * s, -0.4 * s);
      c.quadraticCurveTo(-0.26 * s, -0.05 * s, -0.32 * s, 0.32 * s);
      c.lineTo(0.32 * s, 0.32 * s);
      c.quadraticCurveTo(0.26 * s, -0.05 * s, 0.1 * s, -0.4 * s);
      c.closePath();
      c.fill();
      c.fillRect(-0.34 * s, 0.3 * s, 0.68 * s, 0.12 * s);
    },
    knight: function (c, s) {
      c.beginPath();
      c.moveTo(-0.28 * s, 0.34 * s);
      c.lineTo(0.3 * s, 0.34 * s);
      c.lineTo(0.22 * s, 0.02 * s);
      c.quadraticCurveTo(0.34 * s, -0.2 * s, 0.2 * s, -0.34 * s);
      c.lineTo(0.02 * s, -0.5 * s);
      c.lineTo(-0.14 * s, -0.28 * s);
      c.quadraticCurveTo(-0.34 * s, -0.2 * s, -0.3 * s, 0.06 * s);
      c.closePath();
      c.fill();
    },
    rook: function (c, s) {
      c.fillRect(-0.3 * s, -0.42 * s, 0.6 * s, 0.5 * s);
      c.fillRect(-0.38 * s, -0.56 * s, 0.76 * s, 0.16 * s);
      for (var i = -1; i <= 1; i++) {
        c.fillRect(i * 0.24 * s - 0.06 * s, -0.7 * s, 0.12 * s, 0.16 * s);
      }
      c.fillRect(-0.34 * s, 0.3 * s, 0.68 * s, 0.12 * s);
    },
    bishop: function (c, s) {
      c.beginPath();
      c.moveTo(0, -0.66 * s);
      c.quadraticCurveTo(0.24 * s, -0.2 * s, 0.3 * s, 0.3 * s);
      c.lineTo(-0.3 * s, 0.3 * s);
      c.quadraticCurveTo(-0.24 * s, -0.2 * s, 0, -0.66 * s);
      c.closePath();
      c.fill();
      c.fillRect(-0.34 * s, 0.28 * s, 0.68 * s, 0.12 * s);
    },
    king: function (c, s) {
      c.fillRect(-0.05 * s, -0.72 * s, 0.1 * s, 0.28 * s);
      c.fillRect(-0.16 * s, -0.62 * s, 0.32 * s, 0.09 * s);
      c.beginPath();
      c.moveTo(-0.22 * s, -0.5 * s);
      c.quadraticCurveTo(0, -0.66 * s, 0.22 * s, -0.5 * s);
      c.quadraticCurveTo(0.3 * s, 0.1 * s, 0.26 * s, 0.3 * s);
      c.lineTo(-0.26 * s, 0.3 * s);
      c.quadraticCurveTo(-0.3 * s, 0.1 * s, -0.22 * s, -0.5 * s);
      c.closePath();
      c.fill();
      c.fillRect(-0.34 * s, 0.28 * s, 0.68 * s, 0.12 * s);
    },
    queen: function (c, s) {
      c.beginPath();
      for (var i = 0; i < 5; i++) {
        var x = -0.26 * s + i * 0.13 * s;
        c.moveTo(x, -0.58 * s);
        c.arc(x, -0.62 * s, 0.055 * s, 0, Math.PI * 2);
      }
      c.fill();
      c.beginPath();
      c.moveTo(-0.26 * s, -0.5 * s);
      c.quadraticCurveTo(0, -0.66 * s, 0.26 * s, -0.5 * s);
      c.quadraticCurveTo(0.32 * s, 0.1 * s, 0.28 * s, 0.3 * s);
      c.lineTo(-0.28 * s, 0.3 * s);
      c.quadraticCurveTo(-0.32 * s, 0.1 * s, -0.26 * s, -0.5 * s);
      c.closePath();
      c.fill();
      c.fillRect(-0.34 * s, 0.28 * s, 0.68 * s, 0.12 * s);
    }
  };
  var SIL_KEYS = Object.keys(SIL);

  function initAmbient() {
    var canvas = document.getElementById("ambient");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [];

    function size() {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      /* Density scales with viewport so phones do not carry 40 sprites. */
      var count = Math.max(10, Math.min(30, Math.round((w * h) / 62000)));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          s: 14 + Math.random() * 30,
          vy: -(0.06 + Math.random() * 0.16),
          vx: (Math.random() - 0.5) * 0.08,
          rot: (Math.random() - 0.5) * 0.5,
          vr: (Math.random() - 0.5) * 0.0006,
          a: 0.18 + Math.random() * 0.42,
          kind: SIL_KEYS[i % SIL_KEYS.length]
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(190,220,250,1)";
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.a;
        SIL[p.kind](ctx, p.s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function step(dt) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.rot += p.vr * dt;
        if (p.y < -60) { p.y = h + 50; p.x = Math.random() * w; }
        if (p.x < -60) p.x = w + 50;
        if (p.x > w + 60) p.x = -50;
      }
      draw();
    }

    size();
    draw(); /* first frame immediately: no blank canvas, no CLS */

    window.addEventListener("resize", function () {
      clearTimeout(size._t);
      size._t = setTimeout(function () { size(); draw(); }, 180);
    });

    KC.loop(step);
    /* Reduced motion → the static first frame stays on screen and the loop
       never starts (startLoops() bails out when motion is reduced). */
  }

  /* ---------------------------------------------------------------------
     EFFECT-04 · EXPRESSIVE TYPOGRAPHY
     Splits a heading into words/letters, keeps ONE .sr-only copy of the
     clean sentence for screen readers, and marks the glitch target.
     --------------------------------------------------------------------- */
  function splitHeadings() {
    var nodes = document.querySelectorAll("[data-split]");
    Array.prototype.forEach.call(nodes, function (h) {
      if (h.dataset.splitDone) return;
      var text = (h.getAttribute("data-text") || h.textContent || "").trim();
      var glitchWord = (h.getAttribute("data-glitch-word") || "").toLowerCase();
      var out = document.createElement("span");
      out.className = "sr-only";
      out.textContent = text;

      var wrap = document.createElement("span");
      wrap.className = "split" + (KC.motion.reduced ? "" : " is-split");
      wrap.setAttribute("aria-hidden", "true");

      var n = 0;
      text.split(/\s+/).forEach(function (word, wi) {
        var w = document.createElement("span");
        w.className = "w";
        var bare = word.replace(/[^\w'’-]/g, "").toLowerCase();
        if (glitchWord && bare === glitchWord) {
          w.className += " glitch";
          w.setAttribute("data-text", word);
        }
        word.split("").forEach(function (ch) {
          var l = document.createElement("span");
          l.className = "l";
          l.style.setProperty("--n", n++);
          l.textContent = ch;
          w.appendChild(l);
        });
        if (wi) wrap.appendChild(document.createTextNode(" "));
        wrap.appendChild(w);
      });

      h.textContent = "";
      h.appendChild(out);
      h.appendChild(wrap);
      h.dataset.splitDone = "1";
    });
  }

  /* ---------------------------------------------------------------------
     EFFECT-23 · HERO SEQUENCE
     The CTA is never disabled or hidden with visibility: it animates from
     opacity 0 and stays focusable and hit-testable from the first frame.
     --------------------------------------------------------------------- */
  function initHeroSequence() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      hero.classList.add("is-ready");
    };
    /* The preloader owns the screen for up to 2s: play the sequence as it
       lifts, and fall back to load / a hard timer if it never reports. */
    document.addEventListener("kc:booted", function () { requestAnimationFrame(start); });
    if (document.readyState === "complete") window.setTimeout(start, 1800);
    else window.addEventListener("load", function () { window.setTimeout(start, 1800); });
    setTimeout(start, 2600);
    KC.inView(hero, null, { threshold: 0.02 });
  }

  /* ---------------------------------------------------------------------
     EFFECT-28 · GLASSMORPHIC STICKY NAV
     --------------------------------------------------------------------- */
  function initNav() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var last = false;
    var onScroll = function () {
      var stuck = window.scrollY > 12;
      if (stuck !== last) { nav.classList.toggle("is-stuck", stuck); last = stuck; }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
     EFFECT-10 · ANIMATED CREST LOGO
     Plays once on first load, replays on click; stays a home link.
     --------------------------------------------------------------------- */
  function initCrest() {
    var links = document.querySelectorAll("[data-crest]");
    Array.prototype.forEach.call(links, function (link) {
      var svg = link.querySelector(".crest-draw");
      if (!svg) return;
      var strokes = svg.querySelectorAll(".crest-draw__stroke");
      var len = 0;
      Array.prototype.forEach.call(strokes, function (p) {
        var l = 240;
        try { l = Math.ceil(p.getTotalLength()); } catch (e) {}
        p.style.setProperty("--len", l);
        len = Math.max(len, l);
      });
      var play = function () {
        if (KC.motion.reduced) return;
        svg.classList.remove("is-playing");
        /* force a reflow so the animation restarts on click */
        void svg.getBoundingClientRect();
        svg.classList.add("is-playing");
      };
      KC.onceInView(link, play, { threshold: 0.4 });
      link.addEventListener("click", function () { play(); });
    });
  }

  /* ---------------------------------------------------------------------
     EFFECT-11 · ANIMATED ICONS
     180–280ms feedback on hover (CSS), focus-visible (CSS) and click (here).
     --------------------------------------------------------------------- */
  function initIcons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".icon-btn") : null;
      if (!btn) return;
      btn.classList.remove("is-firing");
      void btn.getBoundingClientRect();
      btn.classList.add("is-firing");
      setTimeout(function () { btn.classList.remove("is-firing"); }, 280);
    });
  }

  /* ---------------------------------------------------------------------
     EFFECT-12 · MICROINTERACTIONS + toggles (aria-pressed)
     --------------------------------------------------------------------- */
  function initToggles() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-toggle-motion]") : null;
      if (t) { KC.setMotion(t.getAttribute("aria-pressed") !== "true", true); return; }

      var press = e.target.closest ? e.target.closest("button[aria-pressed]") : null;
      if (press && !press.hasAttribute("data-toggle-motion") && !press.hasAttribute("data-morph-dot")) {
        var next = press.getAttribute("aria-pressed") !== "true";
        press.setAttribute("aria-pressed", next ? "true" : "false");
        press.dispatchEvent(new CustomEvent("kc:toggle", { detail: { pressed: next } }));
      }
    });
  }

  /* ---------------------------------------------------------------------
     EFFECT-26 · TOUCH EQUIVALENT FOR HOVER REVEALS
     Hover and :focus-visible are handled in CSS. On touch, the first tap
     opens the panel (and focuses it) instead of following the inner link.
     --------------------------------------------------------------------- */
  function initTapReveals() {
    /* Delegated, because the replay's move cards are created after boot. */
    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-tap-reveal]") : null;
      if (!el) return;
      var coarse = window.matchMedia && window.matchMedia("(hover: none)").matches;
      if (!coarse) return;
      var open = el.classList.toggle("is-open");
      if (open) {
        var focusable = el.querySelector("a, button");
        if (focusable && !el.contains(document.activeElement)) {
          e.preventDefault();
          focusable.focus({ preventScroll: true });
        }
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var openEl = e.target.closest ? e.target.closest("[data-tap-reveal].is-open") : null;
      if (openEl) openEl.classList.remove("is-open");
    });
  }

  /* ---------------------------------------------------------------------
     EFFECT-22 · PAGE TRANSITIONS
     Browsers with the View Transitions API use @view-transition
     (navigation: auto) from the stylesheet. Everywhere else we fade the
     shell and announce the route through the live region.
     --------------------------------------------------------------------- */
  var routeStatus = null;
  function announce(msg) {
    if (!routeStatus) routeStatus = document.getElementById("routeStatus");
    if (routeStatus) routeStatus.textContent = msg;
  }
  KC.announce = announce;

  KC.swap = function (fn, opts) {
    opts = opts || {};
    var after = function () {
      fn();
      if (opts.focus) {
        var target = typeof opts.focus === "string" ? document.querySelector(opts.focus) : opts.focus;
        if (target) {
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      }
      if (opts.message) announce(opts.message);
    };
    if (document.startViewTransition && !KC.motion.reduced) {
      var t = document.startViewTransition(after);
      if (t && t.finished) t.finished.catch(function () {});
      return;
    }
    after();
  };

  function initPageTransitions() {
    var supported = !!document.startViewTransition || !!(window.CSS && CSS.supports && CSS.supports("view-transition-name", "x"));
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.hash && url.pathname === location.pathname) return; /* in-page anchor */
      if (a.hasAttribute("download")) return;

      var name = (a.getAttribute("aria-label") || a.textContent || url.pathname).trim().slice(0, 60);
      announce("Opening " + name);

      /* No View Transitions API → CSS fade fallback under 700ms. */
      if (!supported && !KC.motion.reduced) {
        e.preventDefault();
        body.classList.add("is-leaving");
        setTimeout(function () { location.href = url.href; }, 240);
      }
    });

    window.addEventListener("pageshow", function () { body.classList.remove("is-leaving"); });
  }

  /* ---------------------------------------------------------------------
     BOOT
     --------------------------------------------------------------------- */
  function boot() {
    applyMotion();                       /* syncs html[data-motion] + the toggle */
    body.setAttribute("data-paused", document.hidden ? "true" : "false");
    bootPreloader();
    initAmbient();
    splitHeadings();
    initHeroSequence();
    initNav();
    initCrest();
    initIcons();
    initToggles();
    initTapReveals();
    initPageTransitions();
    document.documentElement.classList.remove("no-js");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.KC = KC;
})();
