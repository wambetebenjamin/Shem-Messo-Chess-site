// Optional native page-transition snapshots may be cancelled by quick navigation.
// Settle only those optional animation promises; ordinary navigation remains native.
function settlePageTransition(event) {
  const transition = event.viewTransition;
  transition?.ready?.catch(() => {});
  transition?.finished?.catch(() => {});
}
window.addEventListener("pageswap", settlePageTransition);
window.addEventListener("pagereveal", settlePageTransition);
// Brief, progressive lettering on headings; all text is usable before enhancement.
const root = document.body;
const preference = matchMedia("(prefers-reduced-motion: reduce)");
if (
  root?.classList.contains("ck-design") &&
  !preference.matches &&
  "IntersectionObserver" in window
) {
  const prepared = new WeakMap();
  const observed = new WeakSet();
  const paragraphs = new WeakSet();
  const usable = (element) =>
    !element.closest('[hidden], [aria-hidden="true"]') &&
    element.getClientRects().length;
  const inView = (element) => {
    const box = element.getBoundingClientRect();
    return usable(element) && box.top < innerHeight && box.bottom > 0;
  };
  function reveal(element) {
    if (preference.matches || !usable(element)) return;
    if (element.matches("h1,h2,h3")) {
      const record = prepared.get(element);
      if (!record || record.shown) return;
      record.shown = true;
      element.dataset.letterEntrances = String(
        Number(element.dataset.letterEntrances || 0) + 1,
      );
      element.classList.add("lettering-in");
      const last = element.querySelector(
        ".letter-word:last-child .letter-char:last-child",
      );
      last?.addEventListener(
        "animationend",
        () => element.classList.remove("lettering-in"),
        { once: true },
      );
    } else if (!paragraphs.has(element)) {
      paragraphs.add(element);
      element.classList.add("text-arriving");
      element.addEventListener(
        "animationend",
        () => element.classList.remove("text-arriving"),
        { once: true },
      );
    }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    },
    { threshold: 0.15 },
  );
  function prepare(heading) {
    const text = heading.textContent.replace(/\s+/g, " ").trim();
    if (!text || text.length > 160 || preference.matches) return;
    if (
      prepared.get(heading)?.text === text &&
      heading.querySelector(".letter-word")
    )
      return;
    const words = text.split(" "),
      nodes = [];
    let index = 0;
    for (const [i, word] of words.entries()) {
      if (i) nodes.push(document.createTextNode(" "));
      const wrapper = document.createElement("span");
      wrapper.className = "letter-word";
      wrapper.setAttribute("aria-hidden", "true");
      const chars =
        typeof Intl.Segmenter === "function"
          ? [
              ...new Intl.Segmenter(undefined, {
                granularity: "grapheme",
              }).segment(word),
            ].map((part) => part.segment)
          : Array.from(word);
      for (const letter of chars) {
        const span = document.createElement("span");
        span.className = "letter-char";
        span.textContent = letter;
        span.style.setProperty(
          "--letter-delay",
          `${Math.min(index++ * 5, 180)}ms`,
        );
        wrapper.append(span);
      }
      nodes.push(wrapper);
    }
    heading.classList.remove("lettering-in");
    heading.setAttribute("aria-label", text);
    heading.replaceChildren(...nodes);
    heading.classList.add("text-lettered");
    prepared.set(heading, { text, shown: false });
    if (!observed.has(heading)) {
      observed.add(heading);
      observer.observe(heading);
    }
    if (inView(heading)) reveal(heading);
  }
  function scan() {
    if (preference.matches) return;
    root
      .querySelectorAll("main h1,main h2,main h3,dialog h2")
      .forEach((heading) => {
        prepare(heading);
        if (inView(heading)) reveal(heading);
      });
    root
      .querySelectorAll(
        ".page-intro,.hero-content > p,.registration-heading > p,.section-heading > p,.merch-intro > p",
      )
      .forEach((element) => {
        if (!observed.has(element)) {
          observed.add(element);
          observer.observe(element);
        }
        if (inView(element)) reveal(element);
      });
  }
  scan();
  const hero = document.querySelector(".hero");
  hero?.addEventListener("hero-slide-change", () => {
    if (
      preference.matches ||
      document.hidden ||
      !inView(hero) ||
      document.querySelector("dialog[open]")
    )
      return;
    const heading = hero.querySelector("h1");
    prepare(heading);
    const record = prepared.get(heading);
    if (record) {
      record.shown = false;
      heading.classList.remove("lettering-in");
      void heading.offsetWidth;
      reveal(heading);
    }
    hero.querySelectorAll(".hero-content > p").forEach((paragraph) => {
      paragraphs.delete(paragraph);
      paragraph.classList.remove("text-arriving");
      void paragraph.offsetWidth;
      reveal(paragraph);
    });
  });
  hero?.addEventListener("hero-motion-state", (event) => {
    if (event.detail.stopped)
      hero
        .querySelectorAll(".lettering-in,.text-arriving")
        .forEach((element) =>
          element.classList.remove("lettering-in", "text-arriving"),
        );
  });
  // Step headings, product previews and other dynamically updated titles get the same treatment.
  let queued = false;
  const changes = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      scan();
    });
  });
  changes.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["hidden", "aria-hidden", "open"],
  });
  preference.addEventListener("change", () => {
    if (!preference.matches) return;
    observer.disconnect();
    changes.disconnect();
    root.querySelectorAll(".text-lettered").forEach((heading) => {
      const text = heading.textContent;
      heading.replaceChildren(document.createTextNode(text));
      heading.removeAttribute("aria-label");
      heading.classList.remove("text-lettered");
    });
    root
      .querySelectorAll(".lettering-in,.text-arriving")
      .forEach((element) =>
        element.classList.remove("lettering-in", "text-arriving"),
      );
  });
}

// The independent comparison keeps its own fonts/layout and replays a whole-text entrance.
if (!root?.classList.contains("ck-design")) {
  const hero = document.querySelector(".preview-hero");
  const elements = [
    ...(hero?.querySelectorAll(".hero-copy h1,.hero-copy > p") || []),
  ];
  hero?.addEventListener("hero-slide-change", () => {
    if (preference.matches || document.hidden) return;
    hero.dataset.textReplays = String(
      Number(hero.dataset.textReplays || 0) + 1,
    );
    elements.forEach((element) => {
      element.classList.remove("text-arriving");
      void element.offsetWidth;
      element.classList.add("text-arriving");
      element.addEventListener(
        "animationend",
        () => element.classList.remove("text-arriving"),
        { once: true },
      );
    });
  });
  hero?.addEventListener("hero-motion-state", (event) => {
    if (event.detail.stopped)
      elements.forEach((element) => element.classList.remove("text-arriving"));
  });
}
