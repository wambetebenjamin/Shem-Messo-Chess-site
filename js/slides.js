/* ============================================================================
   SHEM MESSO CHESS ACADEMY · photo slideshows
   Every [data-slides] frame cross-fades through the photos inside it, and any
   caption marked [data-cap-target] swaps in step with the photo it describes.
   Frames only run while they are on screen and stop with the tab, so an idle
   page costs nothing. With prefers-reduced-motion the first photo just stays.
   ============================================================================ */
(function () {
  'use strict';

  var frames = Array.prototype.slice.call(document.querySelectorAll('[data-slides]'));
  if (!frames.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var running = [];

  frames.forEach(function (frame, idx) {
    var slides = Array.prototype.slice.call(frame.querySelectorAll('.slide'));
    if (slides.length < 2) return;

    // only the visible photo stays in the accessibility tree
    slides.forEach(function (slide, n) {
      if (n > 0) slide.setAttribute('aria-hidden', 'true');
    });

    var host = frame.closest('figure') || frame.parentNode;
    var entry = {
      slides: slides,
      i: 0,
      on: false,
      every: parseInt(frame.getAttribute('data-slides'), 10) || 7000,
      due: 0,
      cap: host ? host.querySelector('[data-cap-target]') : null
    };

    new IntersectionObserver(function (entries) {
      entry.on = entries[0].isIntersecting;
      if (entry.on) entry.due = performance.now() + entry.every;
    }, { threshold: 0.12 }).observe(frame);

    entry.due = performance.now() + entry.every + idx * 650; // stagger the first change
    running.push(entry);
  });

  function swapCaption(el, text) {
    if (!el || !text || el.textContent === text) return;
    el.classList.add('swapping');
    window.setTimeout(function () {
      el.textContent = text;
      el.classList.remove('swapping');
    }, 280);
  }

  function loop(now) {
    for (var n = 0; n < running.length; n++) {
      var s = running[n];
      if (!s.on || now < s.due) continue;
      s.due = now + s.every;

      var current = s.slides[s.i];
      s.i = (s.i + 1) % s.slides.length;
      var next = s.slides[s.i];

      current.classList.remove('is-active');
      current.setAttribute('aria-hidden', 'true');
      next.classList.add('is-active');
      next.removeAttribute('aria-hidden');
      swapCaption(s.cap, next.getAttribute('data-cap'));
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
