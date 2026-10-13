const menu = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
function closeMenu() {
  navigation.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Open navigation");
}
menu.addEventListener("click", () => {
  const open = navigation.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
});
navigation
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});
const sections = document.querySelectorAll("main section[id]");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navigation
          .querySelectorAll("a:not(.nav-cta)")
          .forEach((link) =>
            link.classList.toggle(
              "active",
              link.hash === "#" + entry.target.id,
            ),
          );
      }
    });
  },
  { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
);
sections.forEach((section) => observer.observe(section));
const descriptions = {
  "Junior chess academy":
    "Coaching for young players, starting with piece movement and the rules of the game. Ask the academy about suitable sessions for your child.",
  "Club & competitive chess":
    "Club play and practice for players who want to improve their game. Contact us about joining, practice sessions, and tournament preparation.",
  "Chess in schools":
    "For teachers and schools interested in chess. Contact the academy to discuss coaching and how a chess program could work at your school.",
};
const dialog = document.querySelector("#program-dialog");
dialog.setAttribute("aria-labelledby", "dialog-title");
document.querySelectorAll(".program-detail").forEach((button) => {
  button.addEventListener("click", () => {
    const program = button.dataset.program;
    document.querySelector("#dialog-title").textContent = program;
    document.querySelector("#dialog-description").textContent =
      descriptions[program];
    document.querySelector('[name="program"]').value = program;
    dialog.showModal();
  });
});
document
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
document
  .querySelector("#dialog-enquire")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (
    event.target === dialog &&
    (event.clientX < dialog.getBoundingClientRect().left ||
      event.clientX > dialog.getBoundingClientRect().right ||
      event.clientY < dialog.getBoundingClientRect().top ||
      event.clientY > dialog.getBoundingClientRect().bottom)
  )
    dialog.close();
});
document.querySelector("#enquiry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const message = `Hello Kericho Chess Academy! My name is ${data.get("name")}.\nEmail: ${data.get("email")}\nI'm interested in: ${data.get("program")}.\n\n${data.get("message")}`;
  window.open(
    "https://wa.me/254729037585?text=" + encodeURIComponent(message),
    "_blank",
    "noopener,noreferrer",
  );
});
document.querySelector("#year").textContent = new Date().getFullYear();

// Merchandise enquiries use the same contact flow as program enquiries.
document.querySelectorAll(".merchandise-enquiry").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector('[name="program"]').value = "Merchandise";
    const message = document.querySelector('[name="message"]');
    if (!message.value.trim())
      message.value = `Hello, please share the price and availability of the ${button.dataset.item.toLowerCase()}.`;
    else if (!message.value.includes(button.dataset.item))
      message.value += `\nI would also like to ask about: ${button.dataset.item}.`;
    document
      .querySelector("#contact")
      .scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    document.querySelector('[name="name"]').focus({ preventScroll: true });
  });
});

// Content stays visible without JavaScript or when reduced motion is requested.
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
if (!motionPreference.matches && "IntersectionObserver" in window) {
  const reveals = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal-pending");
          entry.target.classList.add("reveal-visible");
          reveals.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(
      ".section-heading, .about-visual, .about-copy, .program-card, .team-card, .team-invite, .merch-card",
    )
    .forEach((element) => {
      element.classList.add("reveal-pending");
      reveals.observe(element);
    });
  motionPreference.addEventListener("change", (event) => {
    if (event.matches) {
      reveals.disconnect();
      document
        .querySelectorAll(".reveal-pending")
        .forEach((element) => element.classList.remove("reveal-pending"));
    }
  });
}
