(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('intro-loader');
  let menuOpen = false;
  let modalOpen = false;
  let lastFocus = null;

  const lockPage = () => root.classList.add('is-locked');
  const unlockPage = () => {
    if (!menuOpen && !modalOpen && !body.classList.contains('is-loading')) {
      root.classList.remove('is-locked');
    }
  };

  // Build the clipped word treatment without changing the page copy.
  document.querySelectorAll('[data-word-reveal]').forEach((element) => {
    let delay = 0;
    const fragment = document.createDocumentFragment();
    [...element.childNodes].forEach((node) => {
      if (node.nodeName === 'BR') {
        fragment.appendChild(document.createElement('br'));
        return;
      }
      if (node.nodeType !== Node.TEXT_NODE) return;
      const words = node.textContent.trim().split(/\s+/).filter(Boolean);
      words.forEach((word, index) => {
        const clip = document.createElement('span');
        clip.className = 'word-clip';
        const inner = document.createElement('span');
        inner.className = 'word-inner';
        inner.style.setProperty('--word-delay', `${delay}ms`);
        inner.textContent = word;
        clip.appendChild(inner);
        fragment.appendChild(clip);
        if (index < words.length - 1) fragment.appendChild(document.createTextNode(' '));
        delay += 140;
      });
    });
    element.replaceChildren(fragment);
  });

  document.querySelectorAll('[data-line-reveal]').forEach((element) => {
    [...element.children].forEach((line, index) => {
      const inner = document.createElement('span');
      inner.className = 'line-inner';
      inner.style.setProperty('--line-delay', `${index * 115}ms`);
      inner.innerHTML = line.innerHTML;
      line.replaceChildren(inner);
      line.classList.add('line-clip');
    });
  });

  const finishIntro = () => {
    if (!body.classList.contains('is-loading')) return;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    if (intro) intro.classList.add('is-done');
    window.setTimeout(() => {
      if (intro) intro.remove();
      unlockPage();
    }, reducedMotion ? 10 : 860);
  };

  if (body.classList.contains('is-loading')) {
    window.scrollTo(0, 0);
    lockPage();
    if (reducedMotion) {
      window.setTimeout(finishIntro, 80);
    } else {
      const start = performance.now();
      const afterLoad = () => {
        const remaining = Math.max(0, 1400 - (performance.now() - start));
        window.setTimeout(finishIntro, remaining);
      };
      if (document.readyState === 'complete') afterLoad();
      else window.addEventListener('load', afterLoad, { once: true });
      window.setTimeout(finishIntro, 2600);
    }
  } else {
    body.classList.add('is-ready');
  }

  const observed = document.querySelectorAll('.inview, [data-line-reveal]:not(.hero-tagline)');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    observed.forEach((element) => observer.observe(element));
  } else {
    observed.forEach((element) => element.classList.add('in-view'));
  }

  // A restrained hero parallax; image is oversized so no edge is exposed.
  const hero = document.querySelector('.hero');
  const heroMedia = document.querySelector('.hero-media');
  let parallaxQueued = false;
  const updateParallax = () => {
    parallaxQueued = false;
    if (!hero || !heroMedia || reducedMotion) return;
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    heroMedia.style.transform = `translate3d(0, ${progress * 10}%, 0)`;
  };
  window.addEventListener('scroll', () => {
    if (parallaxQueued) return;
    parallaxQueued = true;
    requestAnimationFrame(updateParallax);
  }, { passive: true });
  updateParallax();

  const menu = document.getElementById('site-menu');
  const menuButton = document.querySelector('[data-menu-open]');
  const menuClose = document.querySelector('[data-menu-close]');

  const openMenu = () => {
    if (!menu) return;
    lastFocus = document.activeElement;
    menuOpen = true;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    if (menuButton) menuButton.setAttribute('aria-expanded', 'true');
    lockPage();
    window.setTimeout(() => menuClose?.focus(), 100);
  };
  const closeMenu = (restoreFocus = true) => {
    if (!menu) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
    unlockPage();
    if (restoreFocus && lastFocus instanceof HTMLElement) lastFocus.focus();
  };
  menuButton?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', () => closeMenu());
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu(false)));

  const modal = document.getElementById('contact-modal');
  const modalPanel = modal?.querySelector('.modal-panel');
  const firstField = modal?.querySelector('input');

  const openModal = () => {
    if (!modal) {
      window.location.href = 'contact.html';
      return;
    }
    const returnFocus = menuOpen ? menuButton : document.activeElement;
    if (menuOpen) closeMenu(false);
    lastFocus = returnFocus;
    modalOpen = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lockPage();
    window.setTimeout(() => firstField?.focus(), 140);
  };
  const closeModal = () => {
    if (!modal) return;
    modalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    unlockPage();
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };

  document.querySelectorAll('[data-contact-open]').forEach((button) => button.addEventListener('click', openModal));
  document.querySelectorAll('[data-contact-close]').forEach((button) => button.addEventListener('click', closeModal));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (modalOpen) closeModal();
      else if (menuOpen) closeMenu();
    }
    if (event.key !== 'Tab') return;
    const activeLayer = modalOpen ? modalPanel : (menuOpen ? menu : null);
    if (!activeLayer) return;
    const focusables = [...activeLayer.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')]
      .filter((item) => item.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const enquiry = document.getElementById('quick-enquiry');
  enquiry?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(enquiry);
    const name = String(data.get('name') || '').trim();
    const school = String(data.get('school') || '').trim();
    const programme = String(data.get('programme') || '').trim();
    const notes = String(data.get('notes') || '').trim();
    const lines = [
      `Hi Shem, I'm ${name}.`,
      school ? `School / club: ${school}.` : '',
      `I'm interested in ${programme}.`,
      notes ? `Notes: ${notes}` : '',
      'Please share the next steps for Kericho Chess Club & Academy.'
    ].filter(Boolean);
    const url = `https://wa.me/254729037585?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
})();
