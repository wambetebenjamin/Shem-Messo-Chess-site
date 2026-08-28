/* ============================================================================
   SHEM MESSO CHESS ACADEMY · shared runtime
   nav · reveals · counters · countdowns · HUD jitter · FAQ · 3D hero board ·
   form handling (Google Apps Script endpoint + WhatsApp fallback)
   ============================================================================ */
(function () {
  'use strict';

  /* ---------- Config ---------- */
  const WHATSAPP = '254729037585';
  // STEP 1: Deploy a Google Apps Script web app (instructions provided separately).
  // STEP 2: Paste the deployed Web App URL below, replacing the placeholder.
  const SHEETS_ENDPOINT = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

  const PIECE_GLYPHS = {
    p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' }, b: { w: '♗', b: '♝' },
    r: { w: '♖', b: '♜' }, q: { w: '♕', b: '♛' }, k: { w: '♔', b: '♚' }
  };
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

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

  /* ---------- Home hero: 3D board builder ---------- */
  // Position after 1. e4 e5 2. Nf3 Nc6 3. Bc4 — the Italian Game, chapter one
  // of every academy's story.
  const heroBoard = document.getElementById('heroBoard');
  if (heroBoard) {
    const SETUP = {
      a8: 'rb', c6: 'nb', c8: 'bb', d8: 'qb', e8: 'kb', f8: 'bb', g8: 'nb', h8: 'rb',
      a7: 'pb', b7: 'pb', c7: 'pb', d7: 'pb', e5: 'pb', f7: 'pb', g7: 'pb', h7: 'pb',
      a2: 'pw', b2: 'pw', c2: 'pw', d2: 'pw', e4: 'pw', f2: 'pw', g2: 'pw', h2: 'pw',
      a1: 'rw', b1: 'nw', c1: 'bw', d1: 'qw', e1: 'kw', c4: 'bw', f3: 'nw', h1: 'rw'
    };
    const glowSquares = ['e1', 'd1', 'e4', 'c4', 'f3', 'a2'];   // ambient glow under white pieces
    const frag = document.createDocumentFragment();
    const under = document.createElement('div');
    under.className = 'underglow';
    heroBoard.appendChild(under);
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const sqName = FILES[f] + r;
        const cell = document.createElement('div');
        const isLight = ((f + r) % 2) === 1;
        cell.className = 'sq3 ' + (isLight ? 'l' : 'd');
        const piece = SETUP[sqName];
        if (piece) {
          const color = piece[1];
          const glyph = PIECE_GLYPHS[piece[0]][color];
          if (color === 'w' && glowSquares.includes(sqName)) {
            const g = document.createElement('span');
            g.className = 'pg g' + (1 + (glowSquares.indexOf(sqName) % 4));
            cell.appendChild(g);
          }
          const p = document.createElement('span');
          p.className = 'pc ' + color;
          p.textContent = glyph;
          cell.appendChild(p);
        }
        frag.appendChild(cell);
      }
    }
    heroBoard.appendChild(frag);
  }

  /* ---------- Forms: Sheets endpoint + WhatsApp fallback ---------- */
  const waLink = text => 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);

  async function submitEntry(form, endpointFormType, collect, btn, msg, waBtn, waSummary) {
    // Not connected yet → offer the WhatsApp confirmation path.
    if (SHEETS_ENDPOINT.indexOf('PASTE_YOUR') === 0) {
      msg.textContent = 'Details captured. Online submission is not connected yet — tap below to send your entry straight to Shem on WhatsApp.';
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
      if (msg) { msg.textContent = 'Opening WhatsApp with your enquiry — just press send.'; msg.className = 'form-msg show success'; }
    });
  }
})();
