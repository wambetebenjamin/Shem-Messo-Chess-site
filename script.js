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
    "A welcoming introduction to chess for young learners. Explore the pieces, develop board awareness, and learn how to think through a move with guided coaching.",
  "Club & competitive chess":
    "Connect with other chess enthusiasts, practise your tactics, and build your confidence for competitive play. Get in touch to find out about club sessions and tournament preparation.",
  "Chess in schools":
    "Introduce your school community to the joy of chess. Talk to us about chess learning that encourages concentration, problem-solving, and respect for others.",
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
