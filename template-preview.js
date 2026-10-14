const navigation = document.querySelector("#preview-navigation");
const menu = document.querySelector(".menu-toggle");
const dropdown = navigation.querySelector("details");
function closeMenu() {
  navigation.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
  dropdown.open = false;
}
menu.addEventListener("click", () => {
  const open = navigation.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
navigation
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("click", (event) => {
  if (!dropdown.contains(event.target)) dropdown.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (dropdown.open) dropdown.querySelector("summary").focus();
    closeMenu();
  }
});
document.querySelector("#preview-year").textContent = new Date().getFullYear();
document.querySelector("#enquiry").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const text = `Hello Kericho Chess Academy! My name is ${data.get("name")}.\nEmail: ${data.get("email")}\n${data.get("phone") ? "Phone: " + data.get("phone") + "\n" : ""}I'm interested in: ${data.get("program")}.\n${data.get("source") ? "I heard about the academy through: " + data.get("source") + ".\n" : ""}Please share the current schedules, availability and fees.`;
  window.open(
    "https://wa.me/254729037585?text=" + encodeURIComponent(text),
    "_blank",
    "noopener,noreferrer",
  );
  document.querySelector(".form-status").textContent =
    "Your enquiry is ready in WhatsApp. Review it and press Send there. If no window opened, allow pop-ups or use a contact icon.";
});

// Exact slideshow settings from the supplied Elementor source: loop, 5000 ms, fade, 500 ms.
const hero = document.querySelector(".preview-hero");
const photos = [...hero.querySelectorAll(".template-photo")];
const dots = [...hero.querySelectorAll("[data-photo]")];
const pause = hero.querySelector(".photo-pause");
const controls = hero.querySelector(".photo-controls");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let index = 0,
  timer = null,
  paused = false,
  visible = true;
const loaded = () =>
  photos
    .map((p, i) => (p.complete && p.naturalWidth ? i : -1))
    .filter((i) => i >= 0);
function show(next, reset = true) {
  if (!loaded().includes(next)) return;
  photos.forEach((p, i) => p.classList.toggle("active", i === next));
  dots.forEach((d, i) => d.setAttribute("aria-pressed", String(i === next)));
  index = next;
  if (reset) sync();
}
function step(direction, reset = true) {
  const ready = loaded();
  if (ready.length)
    show(
      ready[(ready.indexOf(index) + direction + ready.length) % ready.length],
      reset,
    );
}
function sync() {
  clearInterval(timer);
  const ready = loaded();
  if (ready.length && !ready.includes(index)) show(ready[0], false);
  controls.hidden = ready.length < 2;
  dots.forEach((d, i) => {
    d.disabled = !ready.includes(i);
  });
  pause.disabled = motion.matches;
  pause.setAttribute(
    "aria-label",
    motion.matches
      ? "Automatic transitions disabled for reduced motion"
      : paused
        ? "Resume hero photo transitions"
        : "Pause hero photo transitions",
  );
  pause.querySelector("span").textContent =
    paused || motion.matches ? "▶" : "Ⅱ";
  if (
    ready.length > 1 &&
    visible &&
    !paused &&
    !document.hidden &&
    !motion.matches
  )
    timer = setInterval(
      () => step(1, false),
      Number(hero.dataset.slideDuration),
    );
}
dots.forEach((dot) =>
  dot.addEventListener("click", () => show(Number(dot.dataset.photo))),
);
hero.querySelector(".photo-next").addEventListener("click", () => step(1));
hero.querySelector(".photo-previous").addEventListener("click", () => step(-1));
pause.addEventListener("click", () => {
  paused = !paused;
  sync();
});
photos.forEach((photo) => {
  photo.addEventListener("load", sync);
  photo.addEventListener("error", sync);
});
document.addEventListener("visibilitychange", sync);
motion.addEventListener("change", sync);
if ("IntersectionObserver" in window)
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      sync();
    },
    { threshold: 0.1 },
  ).observe(hero);
sync();
