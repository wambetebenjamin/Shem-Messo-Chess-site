/* ============================================================================
   PAGE SHELL — head · top bar · nav · page banner · footer · scripts
   ----------------------------------------------------------------------------
   Layout follows chesskenya.co.ke: slim utility bar, one-row nav, plain
   centred page-title bands on the inner pages, news at the foot of the page,
   then a quiet footer with no link row. The look is css/site.css.
   ============================================================================ */

const NAV = [
  { key: 'home',        href: 'index.html',        label: 'Home' },
  { key: 'about',       href: 'about.html',        label: 'About' },
  { key: 'coaching',    href: 'coaching.html',     label: 'Coaching' },
  { key: 'tournaments', href: 'tournaments.html',  label: 'Events' },
  { key: 'live',        href: 'live.html',         label: 'Live' },
  { key: 'play',        href: 'play.html',         label: 'Play' },
  { key: 'shop',        href: 'shop.html',         label: 'Shop' },
  { key: 'contact',     href: 'contact.html',      label: 'Contact' },
];

const CREST_ALT = 'Kericho Chess Academy crest: a pawn, king and knight over the motto Forward Ever, Backward Never';

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
    <meta name="theme-color" content="#05101d">
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

    <!-- ============ TOP BAR ============ -->
    <div class="kc-top">
      <div class="kc-wrap kc-top__row">
        <span><i class="fas fa-location-dot"></i>Kericho town, Kenya</span>
        <a href="tel:+254729037585"><i class="fas fa-phone"></i>+254 729 037 585</a>
        <a href="mailto:kerichochessacademy@gmail.com"><i class="fas fa-envelope"></i>kerichochessacademy@gmail.com</a>
        <span class="kc-top__spacer"></span>
        <span class="kc-top__social">
          <a href="https://wa.me/254729037585" target="_blank" rel="noopener" aria-label="WhatsApp the academy"><i class="fab fa-whatsapp"></i></a>
          <a href="https://www.facebook.com/smesso" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="https://www.tiktok.com/@kericho.chess.clu" target="_blank" rel="noopener" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
        </span>
      </div>
    </div>

    <!-- ============ NAV ============ -->
    <header class="kc-header">
      <nav class="navbar navbar-expand-lg kc-nav" id="ftco-navbar" aria-label="Main">
        <div class="kc-wrap kc-nav__inner">
          <a class="navbar-brand kc-brand" href="index.html">
            <img src="assets/logo-gold.png" alt="${CREST_ALT}" width="640" height="650" decoding="async">
            <span class="kc-brand__text"><b>Kericho Chess</b><span>Club &amp; Academy</span></span>
          </a>
          <button class="navbar-toggler kc-burger" type="button" data-toggle="collapse" data-target="#ftco-nav" aria-controls="ftco-nav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="oi oi-menu"></span>
          </button>
          <div class="collapse navbar-collapse" id="ftco-nav">
            <ul class="navbar-nav kc-nav__links">
${NAV.map(n => `              <li class="nav-item"><a class="nav-link${active === n.key ? ' is-active' : ''}" href="${n.href}">${n.label}</a></li>`).join('\n')}
              <li class="nav-item kc-nav__cta"><a class="nav-link" href="contact.html#membership">Join Us</a></li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
`;
}

/* Inner pages open with a plain centred title + one line under it, the way
   chesskenya.co.ke opens "Upcoming Events / Check em out!". */
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
            <img src="assets/logo-gold.png" alt="" width="640" height="650" loading="lazy" decoding="async" aria-hidden="true">
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
