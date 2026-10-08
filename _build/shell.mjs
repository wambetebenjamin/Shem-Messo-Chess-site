/* ============================================================================
   Build helper: shared shell, mirroring the chesskenya.co.ke page frame.
   head · topbar · nav · banner · slim footer · scripts
   ============================================================================ */

const NAV = [
  { key: 'home',        href: 'index.html',        label: 'Home' },
  { key: 'about',       href: 'about.html',        label: 'About' },
  { key: 'coaching',    href: 'coaching.html',     label: 'Coaching' },
  { key: 'tournaments', href: 'tournaments.html',  label: 'Tournaments' },
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
    <meta name="theme-color" content="#05121f">
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
    <link rel="stylesheet" href="css/chess.css">
    <link rel="stylesheet" href="css/night.css">
    <noscript><style>.ftco-animate{ opacity:1 !important; visibility:visible !important; }</style></noscript>
  </head>
  <body class="nk">

    <a class="nk-skip" href="#main">Skip to content</a>

    <!-- ============ TOP BAR ============ -->
    <div class="nk-topbar">
      <div class="container">
        <span class="tb-item"><i class="fas fa-location-dot"></i> Kericho town · coaching across Kericho County</span>
        <a class="tb-item" href="tel:+254729037585"><i class="fas fa-phone"></i> +254 729 037 585</a>
        <a class="tb-item" href="mailto:kerichochessacademy@gmail.com"><i class="fas fa-envelope"></i> kerichochessacademy@gmail.com</a>
        <span class="tb-grow"></span>
        <span class="tb-item tb-social">
          <a href="https://wa.me/254729037585" target="_blank" rel="noopener" aria-label="WhatsApp the academy"><i class="fab fa-whatsapp"></i></a>
          <a href="https://www.facebook.com/smesso" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="https://www.tiktok.com/@kericho.chess.clu" target="_blank" rel="noopener" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
        </span>
      </div>
    </div>

    <!-- ============ NAV ============ -->
    <nav class="navbar navbar-expand-lg navbar-dark ftco_navbar ftco-navbar-light nk-nav" id="ftco-navbar">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          <img class="brand-crest" src="assets/logo-gold.png" alt="${CREST_ALT}" width="640" height="650" decoding="async">
          <span>Kericho Chess<small>Club &amp; Academy</small></span>
        </a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#ftco-nav" aria-controls="ftco-nav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="oi oi-menu"></span>
        </button>
        <div class="collapse navbar-collapse" id="ftco-nav">
          <ul class="navbar-nav ml-auto">${NAV.map(n => `
            <li class="nav-item${n.key === active ? ' active' : ''}"><a href="${n.href}" class="nav-link">${n.label}</a></li>`).join('')}
            <li class="nav-item cta"><a href="contact.html" class="nav-link">Join Us</a></li>
          </ul>
        </div>
      </div>
    </nav>
    <!-- END nav -->
`;
}

/* Page banner — the reference site opens every inner page with a plain
   centred title + a short line under it (e.g. "Upcoming Events / Check em out!"). */
export function banner({ img, title, sub }) {
  return `
    <!-- ============ PAGE BANNER ============ -->
    <section class="hero-wrap hero-wrap-2" style="background-image: url('${img}');">
      <div class="overlay"></div>
      <div class="container">
        <div class="row no-gutters slider-text align-items-center justify-content-center">
          <div class="col-md-10 ftco-animate text-center">
            <h1 class="mb-2 bread">${title}</h1>
            ${sub ? `<p class="nk-banner-sub">${sub}</p>` : ''}
          </div>
        </div>
      </div>
    </section>
`;
}

/* Slim footer: crest + name + copyright, then the social icons.
   Deliberately NO link/menu row down here. */
export function footer() {
  return `
    <!-- ============ FOOTER ============ -->
    <footer class="ftco-footer nk-footer">
      <div class="container">
        <div class="nk-footer__bottom">
          <p class="nk-footer__copy">
            <img src="assets/logo-gold.png" alt="" width="640" height="650" loading="lazy" decoding="async" aria-hidden="true">
            &copy; <span id="nkYear">2026</span> Kericho Chess Club &amp; Academy &middot; Forward Ever, Backward Never
          </p>
          <div class="nk-footer__social">
            <a href="https://wa.me/254729037585" target="_blank" rel="noopener" aria-label="WhatsApp the academy"><i class="fab fa-whatsapp"></i></a>
            <a href="https://www.facebook.com/smesso" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
            <a href="https://www.tiktok.com/@kericho.chess.clu" target="_blank" rel="noopener" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
          </div>
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

/* Closing band: one short call-to-action, then the slim footer.
   Kept deliberately small — the bottom of the page must not crowd. */
export function ctaBand({ title, text, href = 'contact.html', label, icon = 'fa-user-plus', wa = null }) {
  return `
    <!-- ============ CLOSING CALL TO ACTION ============ -->
    <section class="nk-cta">
      <div class="container">
        <div class="nk-cta--split">
          <div class="nk-cta-inner">
            <div>
              <h2>${title}</h2>
              <p class="mb-0">${text}</p>
            </div>
            <div class="nk-cta-actions">
              <a class="btn btn-primary px-4 py-3" href="${href}"><i class="fas ${icon}"></i> ${label}</a>
${wa ? wa.href ? `              <a class="btn btn-tertiary px-4 py-3" href="${wa.href}"${wa.ext ? ' target="_blank" rel="noopener"' : ''}><i class="${wa.icon || 'fab fa-whatsapp'}"></i> ${wa.label}</a>\n` : '' : ''}            </div>
          </div>
        </div>
      </div>
    </section>
`;
}
