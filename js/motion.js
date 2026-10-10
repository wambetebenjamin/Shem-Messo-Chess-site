/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · MOTION RUNTIME      (js/motion.js)
   ----------------------------------------------------------------------------
   Turns the css/motion.css layer on, in four parts:
     1  reveal tagging + IntersectionObserver (rise / mask / wipe)
     2  headings that draw themselves out of a word mask
     3  the morph transition between two pages
     4  scroll progress and the countdown digit flip
   Everything is opt-out: with prefers-reduced-motion, without
   IntersectionObserver, or without this file, the pages read exactly as the
   stylesheet alone describes. No content lives here, only classes.
   ============================================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var EASE = 'cubic-bezier(.16,.84,.24,1)';

  /* =============================================================
     1 · REVEALS
     ============================================================= */
  var GROUPS = [
    ['.kc-head', 'mask'],
    ['.kc-card', 'rise'], ['.kc-event', 'rise'], ['.kc-product', 'rise'],
    ['.kc-member', 'rise'], ['.kc-step', 'rise'], ['.kc-row', 'rise'],
    ['.kc-panel', 'rise'], ['.kc-newsitem', 'rise'], ['.kc-stage', 'rise'],
    ['.kc-gate', 'rise'], ['.kc-modes', 'rise'], ['.kc-form', 'rise'],
    ['.kc-countdown__band', 'rise'], ['.kc-table-wrap', 'rise'], ['.kc-quote', 'rise'],
    ['.kc-office', 'rise'], ['.kc-partner', 'rise'], ['.kc-stat', 'rise'],
    ['.kc-values li', 'mask'], ['.kc-timeline__item', 'rise'],
    ['.kc-faq .faq-item', 'rise'], ['.kc-chip', 'rise']
  ];
  var MEDIA = ['.kc-card__media', '.kc-event__media', '.kc-product__media',
               '.kc-newsitem__img', '.kc-split__media', '.kc-gallery__item', '.kc-member__photo'];

  var tagged = [];
  function tag(sel, kind) {
    document.querySelectorAll(sel).forEach(function (el) {
      // the template's own waypoint reveal already owns .ftco-animate blocks,
      // and the nav / footer are chrome: neither gets a second animation
      if (el.hasAttribute('data-reveal') || el.closest('.ftco-animate') ||
          el.closest('.kc-nav') || el.closest('.kc-footer')) return;
      el.setAttribute('data-reveal', kind);
      var sibs = el.parentElement ? [].slice.call(el.parentElement.children) : [];
      el.style.setProperty('--i', Math.max(0, Math.min(sibs.indexOf(el), 7)));
      tagged.push(el);
    });
  }
  GROUPS.forEach(function (g) { tag(g[0], g[1]); });
  MEDIA.forEach(function (m) {
    document.querySelectorAll(m).forEach(function (el) {
      if (el.hasAttribute('data-reveal')) return;
      if (el.closest('[data-reveal]')) return;
      el.setAttribute('data-reveal', 'wipe');
      el.style.setProperty('--i', 0);
      tagged.push(el);
    });
  });

  if (!('IntersectionObserver' in window)) {
    tagged.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    tagged.forEach(function (el) {
      // anything already on screen enters on the next frame, so the first
      // paint animates instead of appearing mid-scroll
      io.observe(el);
    });
  }

  /* =============================================================
     2 · HEADINGS OUT OF A WORD MASK
     text nodes are wrapped word by word; the words are real text, so the
     heading still reads correctly to a screen reader and to a search engine
     ============================================================= */
  var SPLIT = '.kc-h1, .kc-h2, .kc-banner__title, .kc-slide__text .kc-h1';
  document.querySelectorAll(SPLIT).forEach(function (h) {
    // a heading holding markup (a link, an icon) is left alone: wrapping its
    // words would throw that markup away
    if (h.querySelector('.kc-w') || h.children.length) return;
    var words = (h.textContent || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 14) return;
    var frag = document.createDocumentFragment();
    words.forEach(function (w, i) {
      var span = document.createElement('span');
      span.className = 'kc-w';
      span.style.setProperty('--w', i);
      var inner = document.createElement('i');
      inner.textContent = w;
      span.appendChild(inner);
      frag.appendChild(span);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    h.textContent = '';
    h.appendChild(frag);
    // keep the existing reveal machinery, but line the mask up with it
    var run = function () { h.classList.add('is-lined'); };
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(); io2.disconnect(); } });
      }, { threshold: .3 });
      io2.observe(h);
      setTimeout(run, 1400);   // never leave a heading hidden
    } else { run(); }
  });

  /* =============================================================
     3 · MORPH BETWEEN PAGES
     ============================================================= */
  var KEY = 'kcMorph';
  var layer = null;
  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'kc-morph-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }
  function read() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function stash(v) {
    try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { }
  }

  // arriving: peel the panel away downwards
  var arrive = read();
  if (arrive && Date.now() - arrive.t < 4000) {
    var l = ensureLayer();
    l.style.setProperty('--mx', arrive.x + '%');
    l.style.setProperty('--my', arrive.y + '%');
    root.classList.add('kc-morph-in');
    setTimeout(function () {
      root.classList.remove('kc-morph-in');
      if (l.parentNode) l.parentNode.removeChild(l);
      layer = null;
    }, 560);
  }
  stash(null);

  // leaving: grow the panel out of the click point, then navigate
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target || a.hasAttribute('download') || a.dataset.morph === 'off') return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 ||
        href.indexOf('javascript:') === 0) return;
    if (!/\.html(#.*)?$/.test(href)) return;               // pages only, not pdfs or links out
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;   // same page, just scroll

    e.preventDefault();
    var r = a.getBoundingClientRect();
    stash({ x: Math.round(((r.left + r.width / 2) / window.innerWidth) * 100),
            y: Math.round(((r.top + r.height / 2) / window.innerHeight) * 100),
            t: Date.now() });
    var ly = ensureLayer();
    ly.style.setProperty('--mx', ((r.left + r.width / 2) / window.innerWidth * 100) + '%');
    ly.style.setProperty('--my', ((r.top + r.height / 2) / window.innerHeight * 100) + '%');
    root.classList.add('kc-morph-out');
    setTimeout(function () { location.href = url.pathname + url.search + url.hash; }, 380);
    // if the browser is slow or the nav is blocked, uncover the page again
    setTimeout(function () { root.classList.remove('kc-morph-out'); }, 2600);
  }, false);

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { root.classList.remove('kc-morph-out'); stash(null); }
  });

  /* =============================================================
     4 · SCROLL PROGRESS + COUNTDOWN DIGITS
     ============================================================= */
  var bar = document.createElement('div');
  bar.className = 'kc-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var max = 1, p = 0, raf = 0;
  function measure() {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  function draw() {
    raf = 0;
    var y = window.pageYOffset || root.scrollTop || 0;
    var next = Math.min(1, Math.max(0, y / max));
    if (Math.abs(next - p) < .0015) return;
    p = next;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  measure();
  window.addEventListener('resize', function () { measure(); raf = requestAnimationFrame(draw); }, { passive: true });
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
  draw();

  document.querySelectorAll('.kc-countdown .cd-s').forEach(function (cell) {
    var last = cell.textContent;
    var mo = new MutationObserver(function () {
      if (cell.textContent === last) return;
      last = cell.textContent;
      var box = cell.closest('.cd-cell');
      if (!box || !box.animate) return;
      box.animate(
        [{ transform: 'translateY(0) scaleY(1)' },
         { transform: 'translateY(-3px) scaleY(1.05)' },
         { transform: 'translateY(0) scaleY(1)' }],
        { duration: 460, easing: EASE }
      );
    });
    mo.observe(cell, { childList: true, characterData: true, subtree: true });
  });
})();
