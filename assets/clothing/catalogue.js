// Enhance the static catalogue; ordinary enquiries never depend on this script.
export function enhanceCatalogue(onModalChange) {
  const cards = [...document.querySelectorAll(".merch-card")];
  const tools = document.querySelector(".catalogue-tools");
  const filters = [...tools.querySelectorAll("[data-filter]")];
  const dialog = document.querySelector("#product-preview");
  const image = dialog.querySelector("#preview-image");
  const title = dialog.querySelector("#preview-title");
  const description = dialog.querySelector("#preview-description");
  const enquiry = dialog.querySelector("#preview-enquiry");
  const share = dialog.querySelector("#share-product");
  const status = dialog.querySelector("#share-status");
  const fallback = dialog.querySelector("#share-fallback");
  let selected = null,
    opener = null;
  const shown = () => cards.filter((card) => !card.hidden);
  const shareURL = (card) => {
    const url = new URL("merchandise.html", location.href);
    url.hash = card.id;
    return url.href;
  };
  function render(card) {
    selected = card;
    const source = card.querySelector("img");
    image.src = source.getAttribute("src");
    image.alt = source.alt;
    title.textContent = card.querySelector("h3").textContent;
    description.textContent = card.querySelector(
      ".product-description",
    ).textContent;
    enquiry.href = card.querySelector(".merchandise-enquiry").href;
    enquiry.setAttribute("aria-label", `Enquire about ${title.textContent}`);
    const clothing = card.dataset.category === "clothing";
    dialog.querySelector("#preview-category").textContent = clothing
      ? "Academy clothing"
      : "Chess essentials";
    dialog.querySelector("#preview-help").textContent = clothing
      ? "Ask us about sizing, price and availability."
      : "Ask us about available options, prices and suitability for your group.";
    const list = shown();
    dialog.querySelector("#preview-position").textContent =
      `${list.indexOf(card) + 1} of ${list.length} items`;
    status.textContent = "";
    fallback.hidden = true;
    fallback.querySelector("input").value = shareURL(card);
  }
  function open(card, button) {
    render(card);
    opener = button;
    dialog.showModal();
    document.body.classList.add("product-preview-open");
    onModalChange();
  }
  function move(step) {
    const list = shown();
    render(list[(list.indexOf(selected) + step + list.length) % list.length]);
  }
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      filters.forEach((filter) =>
        filter.setAttribute("aria-pressed", String(filter === button)),
      );
      cards.forEach(
        (card) =>
          (card.hidden =
            button.dataset.filter !== "all" &&
            card.dataset.category !== button.dataset.filter),
      );
      const count = shown().length;
      document.querySelector("#catalogue-status").textContent =
        button.dataset.filter === "all"
          ? `Showing all ${count} items`
          : `Showing ${count} ${button.dataset.filter} items`;
      onModalChange();
    }),
  );
  cards.forEach((card) => {
    const button = card.querySelector(".product-look");
    button.hidden = false;
    button.addEventListener("click", () => open(card, button));
  });
  dialog
    .querySelector(".preview-close")
    .addEventListener("click", () => dialog.close());
  dialog
    .querySelector("#previous-product")
    .addEventListener("click", () => move(-1));
  dialog
    .querySelector("#next-product")
    .addEventListener("click", () => move(1));
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      const stops = [
        ...dialog.querySelectorAll("button, a[href], input"),
      ].filter(
        (element) => !element.disabled && element.getClientRects().length,
      );
      const first = stops[0],
        last = stops.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.target.matches("input, textarea")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("product-preview-open");
    if (opener?.isConnected && !opener.closest(".merch-card").hidden)
      opener.focus({ preventScroll: true });
    onModalChange();
  });
  share.addEventListener("click", async () => {
    const card = selected;
    const url = shareURL(card);
    share.disabled = true;
    status.textContent = "";
    fallback.hidden = true;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${card.querySelector("h3").textContent} — Kericho Chess Academy`,
          url,
        });
      } else {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(url);
        if (selected === card && dialog.open)
          status.textContent = "Item link copied. Ready to share.";
      }
    } catch (error) {
      if (selected === card && dialog.open) {
        if (error.name === "AbortError")
          status.textContent = "Sharing cancelled.";
        else {
          status.textContent =
            "Sharing is unavailable here. Select and copy the item link below.";
          fallback.hidden = false;
        }
      }
    } finally {
      share.disabled = false;
    }
  });
  fallback
    .querySelector("input")
    .addEventListener("click", (event) => event.target.select());
  tools.hidden = false;
  const linked = cards.find((card) => `#${card.id}` === location.hash);
  if (linked) open(linked, linked.querySelector(".product-look"));
}
