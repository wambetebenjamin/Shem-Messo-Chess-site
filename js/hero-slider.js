/* ============================================================================
   HOMEPAGE HERO · cross-fading copy over a shared video background
   ----------------------------------------------------------------------------
   The original Kiddos hero structure and its two text slides stay in place.
   This controller replaces owl on the hero only (the testimony carousel still
   uses owl) and moves .is-active/.leaving between the slide-copy layers. The
   shared tournament video remains fixed behind both slides.

      HOLD  = how long each slide's copy stays visible
      FADE  = the CSS crossfade on .slider-item (keep the two in step)

   Without JS, the first slide remains visible over the video poster/background.
   prefers-reduced-motion gets an instant copy swap from CSS.
   ============================================================================ */
(function () {
  'use strict';

  var HOLD = 7000;  // ms per slide - the dissolve happens inside this window
  var FADE = 1600;  // ms - must match the transition in css/chess.css

  var slider = document.querySelector('.hero-slider');
  if (!slider) return;

  var slides = Array.prototype.slice.call(slider.querySelectorAll('.slider-item'));
  if (!slides.length) return;

  var reduceQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  var index = 0;
  var timer = null;
  // the slider waits while any of these is true, so nobody loses a slide mid-read
  var held = { hover: false, focus: false, hidden: document.hidden };

  /* ---------- dots: same markup/class names owl used to generate ---------- */
  var dotButtons = [];
  if (slides.length > 1) {
    var dots = document.createElement('div');
    dots.className = 'owl-dots';
    slides.forEach(function (slide, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'owl-dot';
      btn.setAttribute('aria-label', 'Show slide ' + (i + 1) + ' of ' + slides.length);
      btn.addEventListener('click', function () {
        goTo(i);
        schedule(); // restart the hold from this click
      });
      dots.appendChild(btn);
      dotButtons.push(btn);
    });
    slider.appendChild(dots);
  }

  function paint() {
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle('is-active', active);
      if (active) slide.classList.remove('leaving');
      // hidden slides are visibility:hidden, so this also keeps their links
      // out of the tab order for keyboard users
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    dotButtons.forEach(function (btn, i) {
      btn.classList.toggle('active', i === index);
      btn.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
  }

  function goTo(next) {
    var prev = index;
    index = (next + slides.length) % slides.length;
    if (prev !== index) {
      // the outgoing slide copy dissolves away over the shared video
      var old = slides[prev];
      old.classList.add('leaving');
      window.setTimeout(function () { old.classList.remove('leaving'); }, FADE);
    }
    paint();
  }

  function tick() {
    timer = null;
    goTo(index + 1);
    schedule();
  }

  function stop() {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function isHeld() {
    return held.hover || held.focus || held.hidden;
  }

  function schedule() {
    stop();
    if (slides.length < 2 || isHeld()) return;
    timer = window.setTimeout(tick, HOLD);
  }

  function update() {
    if (isHeld()) stop();
    else if (timer === null) schedule();
  }

  /* ---------- hover / focus / tab-visibility pause ---------- */
  slider.addEventListener('mouseenter', function () { held.hover = true; update(); });
  slider.addEventListener('mouseleave', function () { held.hover = false; update(); });

  slider.addEventListener('focusin', function () { held.focus = true; update(); });
  slider.addEventListener('focusout', function (e) {
    // ignore focus moving between the two links inside the hero
    if (e.relatedTarget && slider.contains(e.relatedTarget)) return;
    held.focus = false;
    update();
  });

  document.addEventListener('visibilitychange', function () {
    held.hidden = document.hidden;
    update();
  });

  if (reduceQuery && reduceQuery.addEventListener) {
    // flipping the os setting mid-visit: re-time (css handles the swap itself)
    reduceQuery.addEventListener('change', schedule);
  }

  /* ---------- boot ---------- */
  slider.setAttribute('aria-roledescription', 'carousel');
  slider.classList.add('hero-ready');
  paint();
  schedule();
})();
