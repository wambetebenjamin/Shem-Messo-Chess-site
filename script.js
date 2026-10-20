const menu = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
const dropdowns = [...document.querySelectorAll(".dropdown")];
function closeDropdowns(restoreFocus = false) {
  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(".dropdown-toggle");
    const panel = dropdown.querySelector(".dropdown-panel");
    if (
      restoreFocus &&
      !panel.hidden &&
      dropdown.contains(document.activeElement)
    )
      toggle.focus();
    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  });
}
function openDropdown(dropdown) {
  closeDropdowns();
  dropdown
    .querySelector(".dropdown-toggle")
    .setAttribute("aria-expanded", "true");
  dropdown.querySelector(".dropdown-panel").hidden = false;
}
dropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector(".dropdown-toggle");
  toggle.addEventListener("click", () => {
    if (toggle.getAttribute("aria-expanded") === "true") closeDropdowns();
    else openDropdown(dropdown);
  });
  dropdown.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const panel = dropdown.querySelector(".dropdown-panel");
    const items = [...panel.querySelectorAll("a, button")];
    if (panel.hidden) {
      openDropdown(dropdown);
      items[
        event.key === "ArrowUp" || event.key === "End" ? items.length - 1 : 0
      ].focus();
      return;
    }
    const index = items.indexOf(document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length;
    items[next].focus();
  });
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".dropdown")) closeDropdowns();
});
document.addEventListener("focusin", (event) => {
  if (!event.target.closest(".dropdown")) closeDropdowns();
});
function closeMenu() {
  closeDropdowns();
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
  if (event.key === "Escape") {
    closeDropdowns(true);
    closeMenu();
  }
});
// Each main navigation item is a document, not a scrolling section.
const pathName = location.pathname
  .split("/")
  .pop()
  .replace(/\.html$/, "");
const pageName = !pathName || pathName === "index" ? "home" : pathName;
navigation.querySelectorAll("[data-page]").forEach((link) => {
  const current = link.dataset.page === pageName;
  link.classList.toggle("active", current);
  if (current) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
});
const descriptions = {
  "Junior chess academy":
    "Coaching for young players, starting with piece movement and the rules of the game. Ask the academy about suitable sessions for your child.",
  "Club & competitive chess":
    "Club play and practice for players who want to improve their game. Contact us about joining, practice sessions, and tournament preparation.",
  "Chess in schools":
    "For teachers and schools interested in chess. Contact the academy to discuss coaching and how a chess program could work at your school.",
  "Chess scramble":
    "A fast, friendly chess scramble for juniors, families and friends during the holidays. Ask the academy about the format, times and any fees.",
  "Other indoor games":
    "Board and table games beyond chess for the holiday break. Ask the academy about dates, venues and any fees.",
  Dancing:
    "Joyful indoor dancing sessions for the holiday season. Ask the academy about dates, venues and any fees.",
};
const dialog = document.querySelector("#program-dialog");
dialog?.setAttribute("aria-labelledby", "dialog-title");
function openProgram(program) {
  closeDropdowns();
  document.querySelector("#dialog-title").textContent = program;
  document.querySelector("#dialog-description").textContent =
    descriptions[program];
  const field = document.querySelector('[name="program"]');
  if (field) field.value = program;
  document.querySelector("#dialog-enquire").href =
    "contact.html?program=" + encodeURIComponent(program);
  dialog.showModal();
}
document.querySelectorAll(".program-detail").forEach((button) => {
  button.addEventListener("click", () => openProgram(button.dataset.program));
});
document.querySelectorAll("[data-program-choice]").forEach((button) => {
  button.addEventListener("click", () =>
    openProgram(button.dataset.programChoice),
  );
});
document
  .querySelector(".dialog-close")
  ?.addEventListener("click", () => dialog.close());
document
  .querySelector("#dialog-enquire")
  ?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (
    event.target === dialog &&
    (event.clientX < dialog.getBoundingClientRect().left ||
      event.clientX > dialog.getBoundingClientRect().right ||
      event.clientY < dialog.getBoundingClientRect().top ||
      event.clientY > dialog.getBoundingClientRect().bottom)
  )
    dialog.close();
});
document.querySelector("#enquiry-form")?.addEventListener("submit", (event) => {
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

// Carry enquiry context across real page navigation, without storing personal data.
const enquiryForm = document.querySelector("#enquiry-form");
if (enquiryForm) {
  const params = new URLSearchParams(location.search);
  const program = params.get("program");
  const options = [...enquiryForm.elements.program.options].map(
    (option) => option.value,
  );
  if (options.includes(program)) enquiryForm.elements.program.value = program;
  const item = params.get("item");
  if (program === "Merchandise" && item && item.length <= 120) {
    enquiryForm.elements.message.value = `Hello, please share the price and availability of the ${item.toLowerCase()}.`;
  }
}
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

// Crossfade existing photographs; text enhancement follows slide changes without stealing focus.
// Autoplay runs without clicks or hover interruption; explicit pause and reduced motion are respected.
(() => {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const slides = [...hero.querySelectorAll(".hero-slide")];
  const controls = hero.querySelector(".hero-photo-controls");
  const pause = hero.querySelector(".photo-pause");
  const dots = [...hero.querySelectorAll("[data-photo]")];
  let index = 0,
    timer = null,
    userPaused = false,
    inView = true;
  const loaded = () =>
    slides
      .map((image, i) => (image.complete && image.naturalWidth > 0 ? i : -1))
      .filter((i) => i >= 0);
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  function syncTimer() {
    stop();
    hero.dispatchEvent(
      new CustomEvent("hero-motion-state", {
        detail: {
          stopped:
            userPaused ||
            !inView ||
            document.hidden ||
            motionPreference.matches,
        },
      }),
    );
    const ready = loaded();
    controls.hidden = ready.length < 2;
    dots.forEach((dot, i) => {
      dot.disabled = !ready.includes(i);
    });
    pause.disabled = motionPreference.matches;
    pause.setAttribute(
      "aria-label",
      motionPreference.matches
        ? "Automatic transitions disabled for reduced motion"
        : userPaused
          ? "Resume hero photo transitions"
          : "Pause hero photo transitions",
    );
    pause.querySelector("span").textContent =
      userPaused || motionPreference.matches ? "▶" : "Ⅱ";
    if (
      ready.length > 1 &&
      !userPaused &&
      inView &&
      !document.hidden &&
      !motionPreference.matches
    ) {
      timer = setInterval(() => change(1, false), 4000);
    }
  }
  function show(next, reset = true) {
    if (!loaded().includes(next)) return;
    const changed = next !== index;
    slides.forEach((slide, i) =>
      slide.classList.toggle("is-active", i === next),
    );
    dots.forEach((dot, i) =>
      dot.setAttribute("aria-pressed", String(i === next)),
    );
    index = next;
    if (changed) hero.dispatchEvent(new CustomEvent("hero-slide-change"));
    if (reset) syncTimer();
  }
  function change(step, reset = true) {
    const ready = loaded();
    if (!ready.length) return;
    const next = (ready.indexOf(index) + step + ready.length) % ready.length;
    show(ready[next], reset);
  }
  dots.forEach((dot) =>
    dot.addEventListener("click", () => show(Number(dot.dataset.photo))),
  );
  hero.querySelector(".photo-next").addEventListener("click", () => change(1));
  hero
    .querySelector(".photo-previous")
    .addEventListener("click", () => change(-1));
  pause.addEventListener("click", () => {
    userPaused = !userPaused;
    syncTimer();
  });
  document.addEventListener("visibilitychange", syncTimer);
  motionPreference.addEventListener("change", syncTimer);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        syncTimer();
      },
      { threshold: 0.1 },
    ).observe(hero);
  }
  slides.forEach((slide, i) => {
    slide.addEventListener("load", () => {
      if (!loaded().includes(index)) show(i, false);
      syncTimer();
    });
    slide.addEventListener("error", syncTimer);
  });
  syncTimer();
})();

// Team portrait cards follow the hero's pause and reduced-motion rules.
(() => {
  const carousel = document.querySelector(".staff-carousel");
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll(".staff-slide")];
  const dots = [...carousel.querySelectorAll("[data-staff]")];
  const controls = carousel.querySelector(".staff-carousel-controls");
  const pause = carousel.querySelector(".staff-pause");
  let index = 0,
    timer = null,
    paused = false,
    focused = false,
    visible = false;
  const ready = () =>
    slides
      .map((slide, i) => {
        const image = slide.querySelector("img");
        return image.complete && image.naturalWidth ? i : -1;
      })
      .filter((i) => i >= 0);
  function sync() {
    clearInterval(timer);
    const loaded = ready();
    if (loaded.length && !loaded.includes(index)) show(loaded[0], false);
    controls.hidden = loaded.length < 2;
    dots.forEach((dot, i) => {
      dot.disabled = !loaded.includes(i);
    });
    pause.disabled = motionPreference.matches;
    pause.setAttribute(
      "aria-label",
      motionPreference.matches
        ? "Automatic team transitions disabled for reduced motion"
        : paused
          ? "Resume team photo transitions"
          : "Pause team photo transitions",
    );
    pause.querySelector("span").textContent =
      paused || motionPreference.matches ? "▶" : "Ⅱ";
    if (
      loaded.length > 1 &&
      visible &&
      !document.hidden &&
      !paused &&
      !focused &&
      !motionPreference.matches
    )
      timer = setInterval(() => step(1, false), 4000);
  }
  function show(next, reset = true) {
    if (!ready().includes(next)) return;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === next);
      slide.setAttribute("aria-hidden", String(i !== next));
      slide.inert = i !== next;
    });
    dots.forEach((dot, i) =>
      dot.setAttribute("aria-pressed", String(i === next)),
    );
    index = next;
    if (reset) sync();
  }
  function step(direction, reset = true) {
    const loaded = ready();
    if (loaded.length)
      show(
        loaded[
          (loaded.indexOf(index) + direction + loaded.length) % loaded.length
        ],
        reset,
      );
  }
  dots.forEach((dot) =>
    dot.addEventListener("click", () => show(Number(dot.dataset.staff))),
  );
  carousel
    .querySelector(".staff-next")
    .addEventListener("click", () => step(1));
  carousel
    .querySelector(".staff-previous")
    .addEventListener("click", () => step(-1));
  pause.addEventListener("click", () => {
    paused = !paused;
    sync();
  });
  carousel.addEventListener("focusin", (event) => {
    focused = Boolean(event.target.closest(".staff-slide"));
    sync();
  });
  carousel.addEventListener("focusout", (event) => {
    focused = Boolean(
      event.relatedTarget &&
      carousel
        .querySelector(".staff-slide.is-active")
        .contains(event.relatedTarget),
    );
    sync();
  });
  document.addEventListener("visibilitychange", sync);
  motionPreference.addEventListener("change", sync);
  slides.forEach((slide, i) => {
    const image = slide.querySelector("img");
    image.addEventListener("load", () => {
      if (!ready().includes(index)) show(i, false);
      sync();
    });
    image.addEventListener("error", sync);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible)
          slides.forEach((slide) => {
            slide.querySelector("img").loading = "eager";
          });
        sync();
      },
      { threshold: 0.1 },
    ).observe(carousel);
  } else {
    visible = true;
  }
  sync();
})();
