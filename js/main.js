/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · Shared Runtime & Motion Suite
   Theme Switcher · Ripple Physics · Scroll Progress · Back to Top ·
   Staggered Entrance Reveals · Interactive Tilt · Counters · Countdowns ·
   HUD Telemetry · FAQ Accordion · Google Sheets + WhatsApp Forms
   ============================================================================ */
(function () {
  'use strict';

  /* ---------- Toast Feedback System ---------- */
  function showToast(message, iconCls) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const pill = document.createElement('div');
    pill.className = 'toast-pill';
    pill.innerHTML = '<i class="fas ' + (iconCls || 'fa-circle-check') + '"></i><span>' + message + '</span>';
    container.appendChild(pill);

    setTimeout(() => {
      pill.classList.add('toast-out');
      setTimeout(() => pill.remove(), 320);
    }, 2400);
  }

  /* ---------- Theme Switcher (Sunrise, Midnight, Highland) ---------- */
  const THEMES = [
    { id: 'sunrise', name: 'Sunrise', icon: 'fa-sun' },
    { id: 'midnight', name: 'Midnight', icon: 'fa-moon' },
    { id: 'highland', name: 'Highland', icon: 'fa-feather-pointed' }
  ];

  function getActiveTheme() {
    return localStorage.getItem('kcc_theme') || 'sunrise';
  }

  function applyTheme(themeId, notify) {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.setAttribute('data-theme', theme.id);
    localStorage.setItem('kcc_theme', theme.id);

    const themeName = document.getElementById('themeName');
    const themeIcon = document.getElementById('themeIcon');
    if (themeName) themeName.textContent = theme.name;
    if (themeIcon) themeIcon.className = `fas ${theme.icon}`;

    const mobileThemeName = document.getElementById('mobileThemeName');
    const mobileThemeIcon = document.getElementById('mobileThemeIcon');
    if (mobileThemeName) mobileThemeName.textContent = theme.name;
    if (mobileThemeIcon) mobileThemeIcon.className = `fas ${theme.icon}`;

    if (notify) {
      showToast('Switched to ' + theme.name + ' theme', theme.icon);
    }
  }

  function cycleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'sunrise';
    const currentIndex = THEMES.findIndex(t => t.id === current);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    applyTheme(THEMES[nextIndex].id, true);
  }

  applyTheme(getActiveTheme(), false);

  const initThemeButtons = () => {
    applyTheme(getActiveTheme(), false);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && !themeToggle.dataset.bound) {
      themeToggle.dataset.bound = 'true';
      themeToggle.addEventListener('click', cycleTheme);
    }
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    if (mobileThemeToggle && !mobileThemeToggle.dataset.bound) {
      mobileThemeToggle.dataset.bound = 'true';
      mobileThemeToggle.addEventListener('click', cycleTheme);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeButtons);
  } else {
    initThemeButtons();
  }

  /* ---------- Page Transitions ---------- */
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
      setTimeout(() => { window.location.href = href; }, 240);
    });
  }

  /* ---------- Ripple Micro-Interaction on Click / Tap ---------- */
  if (!reduceMotion) {
    document.addEventListener('pointerdown', e => {
      const target = e.target.closest && e.target.closest('.btn, .theme-btn, .back-to-top, .cat-chip, .card-link');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple-ink';
      const size = Math.max(rect.width, rect.height) * 1.6;
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  }

  /* ---------- Config ---------- */
  const WHATSAPP = '254729037585';
  const SHEETS_ENDPOINT = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

  /* ---------- Mobile Navigation ---------- */
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

  /* ---------- Scroll Progress Bar & Nav Glass ---------- */
  const navBar = document.querySelector('.nav');
  if (navBar) {
    let progress = navBar.querySelector('.scroll-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'scroll-progress';
      navBar.appendChild(progress);
    }
    const onScroll = () => {
      const scrollY = window.scrollY;
      navBar.classList.toggle('nav-solid', scrollY > 36);
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPct = totalHeight > 0 ? (scrollY / totalHeight) * 100 : 0;
      progress.style.width = Math.min(100, Math.max(0, progressPct)) + '%';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Back to Top Floating Button ---------- */
  let bttBtn = document.querySelector('.back-to-top');
  if (!bttBtn) {
    bttBtn = document.createElement('button');
    bttBtn.className = 'back-to-top';
    bttBtn.setAttribute('aria-label', 'Back to top');
    bttBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    document.body.appendChild(bttBtn);
  }
  window.addEventListener('scroll', () => {
    bttBtn.classList.toggle('active', window.scrollY > 400);
  }, { passive: true });
  bttBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- Boardwave: Chessboard Shimmer Sweep ---------- */
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

  /* ---------- Active Nav Link ---------- */
  const page = document.body.dataset.page;
  if (page) {
    document.querySelectorAll('[data-nav]').forEach(a => {
      if (a.dataset.nav === page) a.classList.add('active');
    });
  }

  /* ---------- Reveal on Scroll & Stagger System ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // Automatic staggered entrance cascade for card grids
  const cardGrids = document.querySelectorAll(
    '.grid-2, .grid-3, .grid-4, .t-division-grid, .t-perks-grid, .stats-grid, .gallery-grid, .t-podium-row, .steps-strip'
  );
  if ('IntersectionObserver' in window && cardGrids.length) {
    const gridObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          const children = Array.from(entry.target.children);
          children.forEach((child, index) => {
            if (!child.classList.contains('reveal')) {
              child.style.transitionDelay = (index * 0.08) + 's';
              child.classList.add('visible');
            }
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    cardGrids.forEach(grid => {
      grid.classList.add('stagger-grid');
      gridObserver.observe(grid);
    });
  }

  /* ---------- Animated Counters ---------- */
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

  /* ---------- Countdown Timers ---------- */
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

  /* ---------- HUD Metric Jitter (Simulated Live Telemetry) ---------- */
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

  /* ---------- FAQ Accordion ---------- */
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

  /* ---------- Forms: Sheets Endpoint + WhatsApp Fallback ---------- */
  const waLink = text => 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);

  async function submitEntry(form, endpointFormType, collect, btn, msg, waBtn, waSummary) {
    if (SHEETS_ENDPOINT.indexOf('PASTE_YOUR') === 0) {
      msg.textContent = 'Details captured. Online submission is not connected yet. Tap below to send your entry straight to Shem on WhatsApp.';
      msg.className = 'form-msg show';
      if (waBtn) { waBtn.href = waLink(waSummary()); waBtn.classList.add('show'); }
      showToast('Form ready: Send on WhatsApp to confirm slot', 'fa-paper-plane');
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
      showToast('Submitted successfully!', 'fa-check');
      form.reset();
    } catch (err) {
      msg.textContent = 'Something went wrong. Please try again or message Shem directly on WhatsApp.';
      msg.className = 'form-msg show error';
      showToast('Submission error. Please check details.', 'fa-triangle-exclamation');
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
      showToast('Opening WhatsApp…', 'fa-brands fa-whatsapp');
    });
  }
})();
