// Cookie notice: essential cookies only until the visitor chooses. Analytics loads only after "Accept".
(function () {
  const KEY = "academy-consent";
  const css =
    ".cookie-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:1000;max-width:760px;margin:0 auto;" +
    "background:#fff;color:#14233f;border:1px solid #d6dde8;border-radius:12px;box-shadow:0 10px 30px rgba(20,35,63,.18);" +
    "padding:16px 18px;font:15px/1.5 'Open Sans',Arial,sans-serif;display:flex;flex-wrap:wrap;gap:12px;align-items:center}" +
    ".cookie-banner p{margin:0;flex:1 1 320px}.cookie-banner a{color:#14233f;text-decoration:underline}" +
    ".cookie-banner .cookie-actions{display:flex;gap:8px;flex-wrap:wrap}" +
    ".cookie-banner button{min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #14233f;font:600 15px/1 'Open Sans',Arial,sans-serif;cursor:pointer}" +
    ".cookie-banner button.cookie-accept{background:#14233f;color:#fff}" +
    ".cookie-banner button.cookie-decline{background:#fff;color:#14233f}" +
    ".cookie-banner button:focus-visible,.cookie-banner a:focus-visible{outline:3px solid #f5b041;outline-offset:2px}" +
    "@media (max-width:600px){.cookie-banner{bottom:76px}}";
  function store(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode: keep the choice for this visit only */ }
    window.academyConsent = value;
    window.dispatchEvent(new CustomEvent("academy-consent", { detail: value }));
    if (value === "accepted" && typeof window.academyLoadAnalytics === "function") window.academyLoadAnalytics();
  }
  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function banner() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    const box = document.createElement("section");
    box.className = "cookie-banner";
    box.setAttribute("aria-label", "Cookie notice");
    box.innerHTML =
      '<p>We use an essential cookie to keep you signed in. With your permission we also use analytics cookies to see which pages help visitors. ' +
      '<a href="privacy.html">Read our privacy policy</a>.</p>' +
      '<div class="cookie-actions"><button type="button" class="cookie-decline">Decline</button>' +
      '<button type="button" class="cookie-accept">Accept analytics</button></div>';
    box.querySelector(".cookie-accept").addEventListener("click", () => { store("accepted"); box.remove(); });
    box.querySelector(".cookie-decline").addEventListener("click", () => { store("declined"); box.remove(); });
    document.body.appendChild(box);
    box.querySelector(".cookie-accept").focus({ preventScroll: true });
  }
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-cookie-settings]");
    if (!trigger) return;
    event.preventDefault();
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    banner();
  });
  const current = saved();
  if (current) {
    window.academyConsent = current;
    if (current === "accepted" && typeof window.academyLoadAnalytics === "function") window.academyLoadAnalytics();
  } else {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner);
    else banner();
  }
})();
