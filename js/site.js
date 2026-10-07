/* ============================================================================
   SITE · shared chrome + motion utilities
   ----------------------------------------------------------------------------
   One small runtime for the whole site. Everything here is progressive
   enhancement: if this file fails to load, every page still works and every
   section is visible.

     EFFECT-06  ambient background, paused while the tab is hidden
     EFFECT-10  animated crest, plays once on load, replays on click
     EFFECT-11  animated icons (CSS, .icon-btn / .feature__icon)
     EFFECT-12  microinteractions (CSS, 120-320ms)
     EFFECT-20  section SVG backdrops animate only while in the viewport
     EFFECT-22  View Transitions API with a CSS fallback, focus moved to the
                new heading, route change announced to screen readers
     EFFECT-23  hero sequenced reveal, under 1.6s, never blocks the CTAs
     EFFECT-25  branded preloader + scroll progress bar, skips after 3s
     EFFECT-28  glass nav on scroll (CSS) with a solid fallback
     EFFECT-15  scroll-snap rail with keyboard support
     EFFECT-24  skeleton loaders that remove themselves without layout shift

   Every animation honours prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  // matchMedia is universal in browsers, but guard it so a bare DOM (or an
  // unusual embedded webview) cannot take the whole file down.
  var reduceMQ = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: function () {}, addListener: function () {} };
  var reduced = function () { return reduceMQ.matches; };
  var $  = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ------------------------------------------------------------------ *
   * EFFECT-25 · branded preloader + thin scroll progress bar
   * ------------------------------------------------------------------ */
  (function preloader() {
    var bar = doc.createElement('div');
    bar.className = 'scrollbar';
    bar.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(bar);

    var ticking = false;
    function paintProgress() {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paintProgress); }
    }, { passive: true });
    paintProgress();

    var pre = $('#preloader');
    if (!pre) return;
    // never block for more than 2s, and bail out entirely after 3s
    var hardStop = window.setTimeout(done, 3000);
    var softStop = window.setTimeout(done, 1600);
    if (doc.readyState === 'complete') window.setTimeout(done, 250);
    else window.addEventListener('load', function () { window.setTimeout(done, 200); });

    function done() {
      window.clearTimeout(hardStop); window.clearTimeout(softStop);
      if (pre.classList.contains('is-done')) return;
      pre.classList.add('is-done');
      window.setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 600);
    }
    // let a visitor dismiss it straight away
    pre.addEventListener('click', done);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') done(); });
  })();

  /* ------------------------------------------------------------------ *
   * NAV · sticky state, mobile disclosure, EFFECT-10 crest replay
   * ------------------------------------------------------------------ */
  (function nav() {
    var bar = $('.nav');
    if (!bar) return;

    var toggle = $('.nav__toggle', bar);
    var menu = $('#nav-menu');

    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          menu.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) {
          menu.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
      doc.addEventListener('click', function (e) {
        if (!menu.classList.contains('is-open')) return;
        if (bar.contains(e.target)) return;
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }

    // EFFECT-28 — glass once scrolled
    var stuck = false;
    function onScroll() {
      var next = window.scrollY > 12;
      if (next !== stuck) { stuck = next; bar.classList.toggle('is-stuck', next); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // EFFECT-10 — the crest pops once on load, and replays when the brand is clicked
    var brand = $('.nav__brand', bar);
    if (brand && !reduced()) {
      window.setTimeout(function () {
        brand.classList.add('is-playing');
        window.setTimeout(function () { brand.classList.remove('is-playing'); }, 1000);
      }, 260);
      brand.addEventListener('click', function () {
        brand.classList.remove('is-playing');
        // force a reflow so the animation restarts
        void brand.offsetWidth;
        brand.classList.add('is-playing');
        window.setTimeout(function () { brand.classList.remove('is-playing'); }, 1000);
      });
    }
  })();

  /* ------------------------------------------------------------------ *
   * EFFECT-23 · hero sequenced reveal
   * ------------------------------------------------------------------ */
  (function heroReveal() {
    $$('[data-hero-seq]').forEach(function (el, i) {
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', String(i));
    });
    var hero = $('.hero');
    if (!hero) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { hero.classList.add('is-in'); });
    });
  })();

  /* ------------------------------------------------------------------ *
   * Scroll reveal + EFFECT-20 SVG backdrops (IntersectionObserver only)
   * ------------------------------------------------------------------ */
  (function reveal() {
    var targets = $$('[data-reveal]');
    var backdrops = $$('.bg-svg');
    if (!targets.length && !backdrops.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      backdrops.forEach(function (el) { el.classList.add('is-live'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (el) {
      var siblings = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', String(Math.min(siblings, 6)));
      io.observe(el);
    });

    // backdrops animate only while on screen — no work off screen
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-live', entry.isIntersecting);
      });
    }, { threshold: 0 });
    backdrops.forEach(function (el) { io2.observe(el); });
  })();

  /* ------------------------------------------------------------------ *
   * EFFECT-06 · pause ambient motion when the tab is hidden
   * ------------------------------------------------------------------ */
  (function ambient() {
    var layers = $$('.ambient');
    if (!layers.length) return;
    function set(hidden) { layers.forEach(function (l) { l.classList.toggle('is-paused', hidden); }); }
    doc.addEventListener('visibilitychange', function () { set(doc.hidden); });
    set(doc.hidden);
  })();

  /* ------------------------------------------------------------------ *
   * FAQ accordion
   * ------------------------------------------------------------------ */
  (function faq() {
    $$('.faq__q').forEach(function (btn) {
      var item = btn.closest('.faq__item');
      var panel = $('#' + btn.getAttribute('aria-controls'));
      if (!item || !panel) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      item.classList.toggle('is-open', open);

      btn.addEventListener('click', function () {
        open = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        item.classList.toggle('is-open', open);
      });
    });
  })();

  /* ------------------------------------------------------------------ *
   * Filter pills (programs / news / gallery)
   * ------------------------------------------------------------------ */
  (function filters() {
    $$('[data-filter-group]').forEach(function (group) {
      var scope = $(group.getAttribute('data-filter-group'));
      if (!scope) return;
      var buttons = $$('button[data-filter]', group);
      var items = $$('[data-cat]', scope);
      var status = $('.filters__status', group);

      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var value = btn.getAttribute('data-filter');
          buttons.forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          var shown = 0;
          items.forEach(function (item) {
            var match = value === 'all' || item.getAttribute('data-cat') === value;
            item.hidden = !match;
            if (match) shown++;
          });
          if (status) status.textContent = shown + ' ' + (shown === 1 ? 'item' : 'items') + ' shown.';
        });
      });
    });
  })();

  /* ------------------------------------------------------------------ *
   * EFFECT-15 · scroll-snap rail keyboard support
   * ------------------------------------------------------------------ */
  (function rails() {
    $$('.rail').forEach(function (rail) {
      rail.setAttribute('tabindex', '0');
      rail.setAttribute('role', 'group');
      rail.addEventListener('keydown', function (e) {
        var step = rail.clientWidth * 0.8;
        if (e.key === 'ArrowRight') { rail.scrollBy({ left: step, behavior: reduced() ? 'auto' : 'smooth' }); e.preventDefault(); }
        if (e.key === 'ArrowLeft')  { rail.scrollBy({ left: -step, behavior: reduced() ? 'auto' : 'smooth' }); e.preventDefault(); }
        if (e.key === 'Home')       { rail.scrollTo({ left: 0, behavior: reduced() ? 'auto' : 'smooth' }); e.preventDefault(); }
        if (e.key === 'End')        { rail.scrollTo({ left: rail.scrollWidth, behavior: reduced() ? 'auto' : 'smooth' }); e.preventDefault(); }
      });
    });
  })();

  /* ------------------------------------------------------------------ *
   * EFFECT-24 · skeletons + deferred media (zero layout shift)
   * ------------------------------------------------------------------ */
  (function skeletons() {
    $$('[data-src]').forEach(function (holder) {
      var src = holder.getAttribute('data-src');
      if (!src) return;
      var img = holder.tagName === 'IMG' ? holder : new Image();
      if (img !== holder) { img.alt = holder.getAttribute('data-alt') || ''; holder.appendChild(img); }
      else { img.alt = img.alt || holder.getAttribute('data-alt') || ''; }
      img.addEventListener('load', function () { holder.classList.add('is-loaded'); });
      img.addEventListener('error', function () { holder.classList.add('is-loaded'); });
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries, obs) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            img.src = src; obs.unobserve(holder);
          });
        }, { rootMargin: '200px' });
        io.observe(holder);
      } else {
        img.src = src;
      }
    });
  })();

  /* ------------------------------------------------------------------ *
   * EFFECT-22 · View Transitions, focus management, route announcement
   * ------------------------------------------------------------------ */
  (function transitions() {
    var live = doc.createElement('div');
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    doc.body.appendChild(live);

    var supportsVT = typeof doc.startViewTransition === 'function';
    if (supportsVT) doc.documentElement.classList.add('has-vt');

    doc.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;
      if (link.origin && link.origin !== window.location.origin) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      var label = (link.getAttribute('aria-label') || link.textContent || 'New page').trim().slice(0, 80);
      // CSS fallback for browsers without the API
      if (!supportsVT && !reduced()) doc.body.classList.add('is-navigating');
      if (!supportsVT || reduced()) return;

      e.preventDefault();
      var vt = doc.startViewTransition(function () { window.location.href = href; });
      vt.finished.finally(function () {
        live.textContent = label + ' — page loaded.';
        moveFocus();
      });
    });

    // On a normal load (or the CSS fallback), land focus on the new heading.
    window.addEventListener('pageshow', function () {
      doc.body.classList.remove('is-navigating');
      moveFocus();
    });

    function moveFocus() {
      var heading = $('main h1') || $('h1');
      if (!heading) return;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      // only steal focus if the visitor has not interacted yet
      if (doc.activeElement === doc.body) heading.focus({ preventScroll: true });
    }
  })();

  /* ------------------------------------------------------------------ *
   * Generic form validation (aria-invalid + inline messages)
   * ------------------------------------------------------------------ */
  (function forms() {
    $$('form[data-validate]').forEach(function (form) {
      form.setAttribute('novalidate', 'novalidate');
      form.addEventListener('submit', function (e) {
        var bad = null;
        $$('[required]', form).forEach(function (el) {
          var field = el.closest('.field');
          var empty = !String(el.value || '').trim();
          if (field) field.classList.toggle('is-bad', empty);
          el.setAttribute('aria-invalid', empty ? 'true' : 'false');
          if (empty && !bad) bad = el;
        });
        if (bad) {
          e.preventDefault();
          bad.focus();
          var msg = $('.form-msg', form);
          if (msg) { msg.textContent = 'Please fill in the highlighted fields.'; msg.className = 'form-msg is-on is-bad'; }
        }
      });
      form.addEventListener('input', function (e) {
        var field = e.target.closest && e.target.closest('.field');
        if (field && field.classList.contains('is-bad') && String(e.target.value || '').trim()) {
          field.classList.remove('is-bad');
          e.target.setAttribute('aria-invalid', 'false');
        }
      });
    });
  })();

  /* ------------------------------------------------------------------ *
   * WhatsApp-composed forms (feedback, enquiries — anything marked
   * data-whatsapp). Builds the message from the form's own labels so a new
   * field needs no new code, then hands it to WhatsApp. Nothing is stored
   * on the site until the visitor presses send there.
   * ------------------------------------------------------------------ */
  (function whatsappForms() {
    $$('form[data-whatsapp]').forEach(function (form) {
      var number = form.getAttribute('data-whatsapp') || '254729037585';
      var title = form.getAttribute('data-whatsapp-title') || 'Website message';
      var msg = $('.form-msg', form);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        // the shared validator above has already flagged empties
        if ($('.field.is-bad', form)) return;

        var lines = [title, ''];
        $$('.field', form).forEach(function (field) {
          var input = $('input, select, textarea', field);
          var label = $('label', field);
          if (!input || !label) return;
          var value = String(input.value || '').trim();
          if (!value) return;
          var name = label.textContent.replace(/\*|\(optional[^)]*\)/g, '').trim();
          lines.push(name + ': ' + value);
        });
        lines.push('');
        lines.push('Sent from kerichochessacademy');

        window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(lines.join('\n')),
                    '_blank', 'noopener');
        if (msg) {
          msg.textContent = 'Opening WhatsApp with your message — just press send.';
          msg.className = 'form-msg is-on is-good';
        }
      });
    });
  })();

  /* keep the reduced-motion switch live if the visitor changes it */
  if (reduceMQ.addEventListener) {
    reduceMQ.addEventListener('change', function () {
      if (reduced()) {
        $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
        $$('.ambient').forEach(function (el) { el.classList.add('is-paused'); });
      }
    });
  }
})();
