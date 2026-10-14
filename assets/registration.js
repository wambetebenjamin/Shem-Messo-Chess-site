// Guidance only: no duplicate member details, persistence or invented completion status.
const root = document.querySelector("#registration");
const screens = [...root.querySelectorAll("[data-journey-screen]")];
const steps = [...root.querySelectorAll("[data-journey-step]")];
const choices = [...root.querySelectorAll('[name="joining-path"]')];
const next = root.querySelector("#journey-next");
const back = root.querySelector("#journey-back");
const position = root.querySelector("#journey-position");
const opened = new Set([0]);
const titles = [
  "Your path",
  "Membership",
  "Media consent",
  "Updates & next steps",
];
const nextLabels = [
  "Continue to membership →",
  "Continue to media consent →",
  "Continue to updates →",
];
let current = 0,
  path = null;
function refresh() {
  screens.forEach((screen, i) => (screen.hidden = i !== current));
  steps.forEach((step, i) => {
    step.disabled = i > 0 && !path;
    if (i === current) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
    step.classList.toggle("step-opened", opened.has(i) && i !== current);
    step.querySelector(".step-caption").textContent =
      i === current
        ? "Current step"
        : opened.has(i)
          ? "Opened in this guide"
          : "Not opened";
  });
  position.textContent = `Step ${current + 1} of 4 · ${titles[current]}`;
  next.hidden = current === 3;
  next.disabled = current === 0 && !path;
  next.textContent = nextLabels[current] || "Continue";
  back.hidden = current === 0;
  choices.forEach((choice) =>
    choice.closest("label").classList.toggle("choice-selected", choice.checked),
  );
  root.querySelector("#membership-guidance").textContent =
    path === "child"
      ? "Help your child complete the member details requested by the official form. Follow its instructions for verification and payment."
      : "Complete your member details in the official form. Follow its instructions for verification and payment.";
  root.querySelector("#consent-guidance").textContent =
    path === "child"
      ? "A parent or guardian should review the consent choices below. Complete one official consent form for each child."
      : "The supplied consent form is addressed to parents and guardians. If you are joining for yourself, it may not apply: ask the academy about adult media permission, or continue without opening this form.";
}
function show(index) {
  if (!path && index > 0) return;
  current = Math.max(0, Math.min(3, index));
  opened.add(current);
  refresh();
  const heading = screens[current].querySelector("h2");
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: "start", behavior: "auto" });
}
choices.forEach((choice) =>
  choice.addEventListener("change", () => {
    path = choice.value;
    refresh();
  }),
);
steps.forEach((step) =>
  step.addEventListener("click", () => show(Number(step.dataset.journeyStep))),
);
next.addEventListener("click", () => show(current + 1));
back.addEventListener("click", () => show(current - 1));
root.querySelectorAll(".load-google-form").forEach((button) => {
  button.addEventListener("click", () => {
    const frame = document.getElementById(button.dataset.frame);
    frame.src = frame.dataset.src;
    frame.hidden = false;
    button.hidden = true;
    document.getElementById(button.dataset.frame + "-status").textContent =
      "Opening the official form. Use Google’s own Submit button when finished. If it does not appear, use the new-tab link above.";
    // Do not inspect iframe load/content or infer submission success across origins.
  });
});
root.querySelector("#restart-registration").addEventListener("click", () => {
  const frames = [...root.querySelectorAll("iframe")];
  if (
    frames.some((frame) => frame.hasAttribute("src")) &&
    !confirm(
      "Start a new guide? Unsubmitted entries in embedded forms will be cleared. Any forms already submitted to Google are unaffected.",
    )
  )
    return;
  frames.forEach((frame) => {
    frame.removeAttribute("src");
    frame.hidden = true;
  });
  root.querySelectorAll(".load-google-form").forEach((button) => {
    button.hidden = false;
    document.getElementById(button.dataset.frame + "-status").textContent =
      "The official form opens inside this step. If embedding or Google sign-in is blocked, use the new-tab link above.";
  });
  choices.forEach((choice) => (choice.checked = false));
  path = null;
  opened.clear();
  show(0);
});
refresh();
