const visuals = [...document.querySelectorAll("[data-apparel]")];
const toggle = document.querySelector("#product-motion");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const hover = matchMedia("(hover: hover)");
const visible = new Set();
let timer = null,
  index = 0,
  paused = false;
function swipe(visual) {
  if (preference.matches || visual.classList.contains("is-swiping")) return;
  const image = visual.querySelector("img");
  if (!image.complete || !image.naturalWidth) return;
  visual.classList.add("is-swiping");
  visual.dataset.swipes = String(Number(visual.dataset.swipes || 0) + 1);
  const clear = () => visual.classList.remove("is-swiping");
  image.addEventListener("animationend", clear, { once: true });
  setTimeout(clear, 750);
}
function sync() {
  clearTimeout(timer);
  timer = null;
  toggle.hidden = preference.matches;
  toggle.setAttribute(
    "aria-label",
    paused ? "Resume product motion" : "Pause product motion",
  );
  toggle.setAttribute("aria-pressed", String(paused));
  toggle.textContent = paused ? "▶" : "Ⅱ";
  toggle.title = paused ? "Resume" : "Pause";
  if (paused || preference.matches || document.hidden || !visible.size) {
    visuals.forEach((visual) => visual.classList.remove("is-swiping"));
    return;
  }
  timer = setTimeout(() => {
    const candidates = visuals.filter(
      (visual) =>
        visible.has(visual) &&
        !(hover.matches && visual.matches(":hover")) &&
        !visual.closest(".merch-card").matches(":focus-within"),
    );
    if (candidates.length) swipe(candidates[index++ % candidates.length]);
    sync();
  }, 2600);
}
toggle.addEventListener("click", () => {
  paused = !paused;
  sync();
});
for (const visual of visuals) {
  visual.addEventListener("mouseenter", () => {
    if (hover.matches) visual.classList.remove("is-swiping");
  });
  visual
    .closest(".merch-card")
    .addEventListener("focusin", () => visual.classList.remove("is-swiping"));
  let start = null;
  visual.addEventListener("pointerdown", (event) => {
    if (event.button === 0) start = { x: event.clientX, y: event.clientY };
  });
  visual.addEventListener("pointerup", (event) => {
    if (
      start &&
      Math.abs(event.clientX - start.x) > 30 &&
      Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y)
    )
      swipe(visual);
    start = null;
  });
  visual.addEventListener("pointercancel", () => (start = null));
}
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      sync();
    },
    { threshold: 0.2 },
  );
  visuals.forEach((visual) => observer.observe(visual));
} else {
  visuals.forEach((visual) => visible.add(visual));
}
preference.addEventListener("change", sync);
document.addEventListener("visibilitychange", sync);
sync();
