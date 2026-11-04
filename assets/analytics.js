// Google Analytics 4, loaded only after the visitor accepts analytics cookies (see cookie-consent.js).
// The measurement ID comes from <meta name="analytics-id" content="G-XXXXXXX"> on each page.
// While that content is empty, nothing is loaded and no data is sent.
(function () {
  window.academyLoadAnalytics = function () {
    const meta = document.querySelector('meta[name="analytics-id"]');
    const id = (meta && meta.content || "").trim();
    if (!/^G-[A-Z0-9]{4,}$/.test(id) || window.__academyAnalytics) return;
    window.__academyAnalytics = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(script);
  };
})();
