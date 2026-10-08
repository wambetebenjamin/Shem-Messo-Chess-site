/* ============================================================================
   PAGE SHELL · head · dropdown nav · page title · footer · scripts
   ----------------------------------------------------------------------------
   Layout follows chesskenya.co.ke: the nav sits at the very top of the page
   with **dropdown groups** (About · Coaching · Events · Players · News ·
   Shop · Contact), inner pages open with a plain centred title over the page
   background, and the footer is quiet, with no link row. The look is
   css/site.css: off-white #F8F9FA + strategic blue #4A90E2.
   ============================================================================ */

const NAV = [
  { key: 'home', href: 'index.html', label: 'Home' },
  {
    key: 'about', href: 'about.html', label: 'About',
    items: [
      { href: 'about.html#story', label: 'Our story', note: 'One coach, sixty-four squares' },
      { href: 'about.html#tenets', label: 'Vision, mission & values' },
      { href: 'about.html#objectives', label: 'Aims & objectives', note: 'What we actually do, in order' },
      { href: 'about.html#milestones', label: 'Milestones', note: 'What we have built so far' },
      { href: 'about.html#people', label: 'Office bearers' },
      { href: 'about.html#gallery', label: 'Club gallery', note: 'Boards, halls and kit' },
    ],
  },
  {
    key: 'coaching', href: 'coaching.html', label: 'Coaching',
    items: [
      { href: 'coaching.html#includes', label: 'Included in every track' },
      { href: 'coaching.html#tracks', label: 'The tracks', note: 'School · private · prep · Saturday club' },
      { href: 'coaching.html#method', label: 'The four-phase method' },
      { href: 'coaching.html#fees', label: 'Fees & payment' },
    ],
  },
  {
    key: 'tournaments', href: 'tournaments.html', label: 'Events',
    items: [
      { href: 'tournaments.html#next', label: 'Upcoming events', note: 'Next fixture and countdowns' },
      { href: 'tournaments.html#calendar', label: 'Calender' },
      { href: 'tournaments.html#categories', label: 'Categories & entry fees' },
      { href: 'tournaments.html#register', label: 'Register a learner' },
      { href: 'tournaments.html#honour-roll', label: 'Honour roll & standings' },
    ],
  },
  {
    key: 'players', href: 'index.html#players', label: 'Players',
    activeOn: ['players', 'live', 'play'],
    align: 'right',
    items: [
      { href: 'index.html#players', label: 'Top players' },
      { href: 'tournaments.html#honour-roll', label: 'All players', note: 'Circuit standings table' },
      { href: 'live.html', label: 'Live broadcast', note: 'Boards 1 to 4 on fixture days' },
      { href: 'play.html', label: 'Play a board', note: 'Pass and play on one device' },
    ],
  },
  {
    key: 'news', href: 'index.html#news', label: 'News',
    align: 'right',
    items: [
      { href: 'index.html#news', label: 'Latest news' },
      { href: 'about.html#milestones', label: 'More articles', note: 'The club so far' },
    ],
  },
  { key: 'shop', href: 'shop.html', label: 'Shop' },
  {
    key: 'contact', href: 'contact.html', label: 'Contact',
    align: 'right',
    items: [
      { href: 'contact.html#team', label: 'Contact us', note: 'Office bearers and direct lines' },
      { href: 'contact.html#membership', label: 'Membership', note: 'Join the academy' },
      { href: 'contact.html#enquiry', label: 'Send an enquiry' },
      { href: 'contact.html#secretary', label: 'Our Secretary in Samarkand' },
      { href: 'contact.html#faq', label: 'Questions & answers' },
    ],
  },
];

const CREST_ALT = 'Kericho Chess Academy crest: a pawn, king and knight over the motto Forward Ever, Backward Never';

function navItem(n, active) {
  const isActive = active === n.key || (n.activeOn || []).includes(active);
  if (!n.items) {
    return `              <li class="nav-item"><a class="nav-link${isActive ? ' is-active' : ''}" href="${n.href}">${n.label}</a></li>`;
  }
  const id = `nv-${n.key}`;
  const base = n.href.split('#')[0];
  const rows = [{ href: n.href, label: `${n.label} overview`, note: 'Jump to the page', itemActive: isActive }]
    .concat(n.items.map(it => ({
      href: it.href, label: it.label, note: it.note,
      itemActive: isActive && it.href.startsWith(base),
    })));
  const items = rows.map(it =>
    `                  <a class="dropdown-item${it.itemActive ? ' is-active' : ''}" href="${it.href}">${it.label}${it.note ? `<small>${it.note}</small>` : ''}</a>`
  ).join('\n');
  const menuClass = n.align === 'right' ? 'dropdown-menu dropdown-menu--right' : 'dropdown-menu';
  return `              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle${isActive ? ' is-active' : ''}" href="${n.href}" id="${id}" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">${n.label}</a>
                <div class="${menuClass}" aria-labelledby="${id}">
${items}
                </div>
              </li>`;
}

export function head({ title, desc, active = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>${title}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="${desc}">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link rel="apple-touch-icon" href="assets/favicon.png">
    <meta name="theme-color" content="#F8F9FA">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:type" content="website">
    <link href="https://fonts.googleapis.com/css?family=Work+Sans:100,200,300,400,500,600,700,800,900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/open-iconic-bootstrap.min.css">
    <link rel="stylesheet" href="css/animate.css">
    <link rel="stylesheet" href="css/owl.carousel.min.css">
    <link rel="stylesheet" href="css/owl.theme.default.min.css">
    <link rel="stylesheet" href="css/magnific-popup.css">
    <link rel="stylesheet" href="css/aos.css">
    <link rel="stylesheet" href="css/ionicons.min.css">
    <link rel="stylesheet" href="css/flaticon.css">
    <link rel="stylesheet" href="css/icomoon.css">
    <link rel="stylesheet" href="css/kiddos.css">
    <link rel="stylesheet" href="css/site.css">
    <noscript><style>.ftco-animate{ opacity:1 !important; visibility:visible !important; }</style></noscript>
  </head>
  <body>

    <a class="kc-skip" href="#main">Skip to content</a>

    <!-- ============ NAV ============ -->
    <header class="kc-header">
      <nav class="navbar navbar-expand-lg kc-nav" id="ftco-navbar" aria-label="Main">
        <div class="kc-wrap kc-nav__inner">
          <a class="navbar-brand kc-brand" href="index.html">
            <img src="assets/logo.png" alt="${CREST_ALT}" width="640" height="650" decoding="async">
            <span class="kc-brand__text"><b>Kericho Chess</b><span>Club &amp; Academy</span></span>
          </a>
          <button class="navbar-toggler kc-burger" type="button" data-toggle="collapse" data-target="#ftco-nav" aria-controls="ftco-nav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="oi oi-menu"></span>
          </button>
          <div class="collapse navbar-collapse" id="ftco-nav">
            <ul class="navbar-nav kc-nav__links">
${NAV.map(n => navItem(n, active)).join('\n')}
              <li class="nav-item kc-nav__cta"><a class="nav-link" href="contact.html#membership">Join Us</a></li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
`;
}

/* Inner pages open with a plain centred title + one line under it, the way
   chesskenya.co.ke opens "Upcoming Events / Check em out!". No band, no
   strip, no tinted bar: the title sits straight on the page background. */
export function banner({ title, sub }) {
  return `
    <!-- ============ PAGE TITLE ============ -->
    <section class="kc-banner">
      <div class="kc-wrap">
        <h1 class="kc-banner__title">${title}</h1>
${sub ? `        <p class="kc-banner__sub">${sub}</p>\n` : ''}      </div>
    </section>
`;
}

/* Footer: crest + name + copyright + socials. No link row, no menu. */
export function footer() {
  return `
    <!-- ============ FOOTER ============ -->
    <footer class="kc-footer">
      <div class="kc-wrap">
        <div class="kc-footer__row">
          <div class="kc-footer__brand">
            <img src="assets/logo.png" alt="" width="640" height="650" loading="lazy" decoding="async" aria-hidden="true">
            <span class="kc-footer__text">
              <b>Kericho Chess Club &amp; Academy</b>
              <span>Forward Ever, Backward Never</span>
            </span>
          </div>
          <div class="kc-footer__social">
            <a href="https://wa.me/254729037585" target="_blank" rel="noopener" aria-label="WhatsApp the academy"><i class="fab fa-whatsapp"></i></a>
            <a href="https://www.facebook.com/smesso" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="https://www.tiktok.com/@kericho.chess.clu" target="_blank" rel="noopener" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
          </div>
        </div>
        <div class="kc-footer__rule"></div>
        <div class="kc-footer__bottom">
          <span>&copy; <span id="nkYear">2026</span> Kericho Chess Club &amp; Academy · Forward Ever, Backward Never</span>
        </div>
      </div>
    </footer>
`;
}

export function scripts({ board3d = false, page = false, chessCore = false } = {}) {
  return `
  <script>document.getElementById('nkYear').textContent = new Date().getFullYear();</script>
${board3d ? '  <script type="module" src="js/board3d.js"></script>\n' : ''}  <script src="js/jquery.min.js"></script>
  <script src="js/jquery-migrate-3.0.1.min.js"></script>
  <script src="js/popper.min.js"></script>
  <script src="js/bootstrap.min.js"></script>
  <script src="js/jquery.easing.1.3.js"></script>
  <script src="js/jquery.waypoints.min.js"></script>
  <script src="js/jquery.stellar.min.js"></script>
  <script src="js/owl.carousel.min.js"></script>
  <script src="js/jquery.magnific-popup.min.js"></script>
  <script src="js/aos.js"></script>
  <script src="js/jquery.animateNumber.min.js"></script>
  <script src="js/scrollax.min.js"></script>
${chessCore ? '  <script src="js/chess.js"></script>\n' : ''}  <script src="js/kiddos-main.js"></script>
  <script src="js/smc.js"></script>
${page ? `  <script src="js/${page}.js"></script>\n` : ''}  </body>
</html>
`;
}
