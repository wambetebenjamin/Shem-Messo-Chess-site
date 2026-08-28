/* ============================================================================
   SHEM MESSO CHESS ACADEMY · shared runtime
   nav · reveals · counters · countdowns · HUD jitter · FAQ · forms ·
   form handling (Google Apps Script endpoint + WhatsApp fallback)
   ============================================================================ */
(function () {
  'use strict';

  /* ---------- Page transitions ---------- */
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('page-in')));
  window.addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('page-out'); });

  if (!reduceMotion) {
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      const isLocalPage = !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey &&
        href.endsWith('.html');
      if (!isLocalPage) return;
      e.preventDefault();
      document.body.classList.add('page-out');
      setTimeout(() => { window.location.href = href; }, 250);
    });
  }

  /* ---------- Config ---------- */
  const WHATSAPP = '254729037585';
  // STEP 1: Deploy a Google Apps Script web app (instructions provided separately).
  // STEP 2: Paste the deployed Web App URL below, replacing the placeholder.
  const SHEETS_ENDPOINT = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';


  /* ---------- Mobile nav ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? '<i class="fas fa-xmark"></i>' : '<i class="fas fa-bars"></i>';
    });
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileMenu.classList.remove('open'))
    );
  }

  /* ---------- Nav gains glass after scroll ---------- */
  const navBar = document.querySelector('.nav');
  if (navBar) {
    const onScroll = () => navBar.classList.toggle('nav-solid', window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Boardwave: chessboard shimmer sweep ---------- */
  document.querySelectorAll('.boardwave').forEach(wave => {
    const COLS = 12, ROWS = 6;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('i');
        cell.style.animationDelay = ((r + c) * 160) + 'ms';
        wave.appendChild(cell);
      }
    }
  });

  /* ---------- Active nav link ---------- */
  const page = document.body.dataset.page;
  if (page) {
    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === page) a.classList.add('active');
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = el => {
    const target = parseFloat(el.dataset.count);
    const dur = 1800; const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.4 });
    counters.forEach(el => cio.observe(el));
  }

  /* ---------- Countdown timers ---------- */
  const clocks = document.querySelectorAll('[data-countdown]');
  const pad = n => String(n).padStart(2, '0');
  const tickCountdowns = () => {
    const now = Date.now();
    clocks.forEach(el => {
      const target = new Date(el.dataset.countdown).getTime();
      let diff = Math.max(0, target - now);
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
      const m = Math.floor(diff / 60000);    diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      const set = (cls, val) => { const n = el.querySelector(cls); if (n) n.textContent = pad(val); };
      set('.cd-d', d); set('.cd-h', h); set('.cd-m', m); set('.cd-s', s);
    });
  };
  if (clocks.length) { tickCountdowns(); setInterval(tickCountdowns, 1000); }

  /* ---------- HUD metric jitter (simulated live telemetry) ---------- */
  const jitters = document.querySelectorAll('[data-jitter]');
  if (jitters.length) {
    setInterval(() => {
      jitters.forEach(el => {
        const [base, amp] = el.dataset.jitter.split('|').map(Number);
        const v = Math.round(base + (Math.random() * 2 - 1) * amp);
        el.textContent = v.toLocaleString();
      });
    }, 2800);
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o => {
        o.classList.remove('open');
        const oa = o.querySelector('.faq-a'); if (oa) oa.style.maxHeight = null;
      });
      if (!isOpen) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---------- Forms: Sheets endpoint + WhatsApp fallback ---------- */
  const waLink = text => 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);

  async function submitEntry(form, endpointFormType, collect, btn, msg, waBtn, waSummary) {
    // Not connected yet → offer the WhatsApp confirmation path.
    if (SHEETS_ENDPOINT.indexOf('PASTE_YOUR') === 0) {
      msg.textContent = 'Details captured. Online submission is not connected yet. Tap below to send your entry straight to Shem on WhatsApp.';
      msg.className = 'form-msg show';
      if (waBtn) { waBtn.href = waLink(waSummary()); waBtn.classList.add('show'); }
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Submitting…';
    msg.className = 'form-msg show'; msg.textContent = '';
    try {
      const payload = { formType: endpointFormType, timestamp: new Date().toISOString(), ...collect() };
      await fetch(SHEETS_ENDPOINT, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      msg.textContent = 'Submitted. Shem will confirm your slot once payment is received on M-Pesa.';
      msg.className = 'form-msg show success';
      form.reset();
    } catch (err) {
      msg.textContent = 'Something went wrong. Please try again or message Shem directly on WhatsApp.';
      msg.className = 'form-msg show error';
    } finally {
      btn.disabled = false; btn.textContent = original;
    }
  }

  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  // Tournament registration (tournaments.html)
  const tForm = document.getElementById('tournamentForm');
  if (tForm) {
    tForm.addEventListener('submit', e => {
      e.preventDefault();
      const collect = () => ({
        name: val('t_name'), age: val('t_age'), gender: val('t_gender'),
        category: val('t_category'), school: val('t_school'),
        email: val('t_email'), phone: val('t_phone')
      });
      submitEntry(tForm, 'Tournament', collect,
        document.getElementById('t_submit'),
        document.getElementById('t_msg'),
        document.getElementById('t_wa'),
        () => 'Hi Shem, tournament entry for ' + collect().name +
              ' · Category: ' + collect().category +
              ' · School/Club: ' + collect().school +
              ' · Phone: ' + collect().phone +
              ' · Age: ' + collect().age + ' (' + collect().gender + ').'
      );
    });
  }

  // Membership (contact.html)
  const mForm = document.getElementById('membershipForm');
  if (mForm) {
    mForm.addEventListener('submit', e => {
      e.preventDefault();
      const collect = () => ({
        name: val('m_name'), age: val('m_age'), gender: val('m_gender'),
        school: val('m_school'), email: val('m_email'), phone: val('m_phone')
      });
      submitEntry(mForm, 'Membership', collect,
        document.getElementById('m_submit'),
        document.getElementById('m_msg'),
        document.getElementById('m_wa'),
        () => 'Hi Shem, academy membership for ' + collect().name +
              ' · School/Club: ' + collect().school +
              ' · Phone: ' + collect().phone +
              ' · Age: ' + collect().age + ' (' + collect().gender + ').'
      );
    });
  }

  // Coaching enquiry → pure WhatsApp composer (contact.html)
  const cForm = document.getElementById('coachingForm');
  if (cForm) {
    cForm.addEventListener('submit', e => {
      e.preventDefault();
      const text = 'Hi Shem, coaching enquiry from ' + val('c_name') +
                   ' · School/Club: ' + val('c_school') +
                   ' · Interested in: ' + val('c_program') +
                   ' · Message: ' + val('c_notes');
      window.open(waLink(text), '_blank');
      const msg = document.getElementById('c_msg');
      if (msg) { msg.textContent = 'Opening WhatsApp with your enquiry. Just press send.'; msg.className = 'form-msg show success'; }
    });
  }
})();

/* ---------- MOTION SUITE: pointer glow follower + 3D card tilt ---------- */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const glow = document.createElement('div');
  glow.id = 'ptr-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);
  let tx = window.innerWidth / 2, ty = 180, gx = tx, gy = ty;
  window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    gx += (tx - gx) * 0.14; gy += (ty - gy) * 0.14;
    glow.style.transform = 'translate(' + (gx - 170) + 'px,' + (gy - 170) + 'px)';
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll('.grid-3 > .hud, .grid-4 > .hud, .cat-chip').forEach(function (card) {
    card.style.willChange = 'transform';
    card.addEventListener('pointermove', function (e) {
      if (card.classList.contains('reveal') && !card.classList.contains('visible')) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'perspective(900px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg) translateY(-4px)';
    });
    card.addEventListener('pointerleave', function () {
      card.style.transition = 'transform .45s var(--ease)';
      card.style.transform = '';
      setTimeout(function () { card.style.transition = ''; }, 460);
    });
  });
})();
