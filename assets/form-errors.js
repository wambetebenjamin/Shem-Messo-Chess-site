// Inline form errors: names the problem beside the field, marks it for assistive technology,
// moves focus to the first problem, and clears the message once the field is corrected.
(function () {
  const RED = "#b42318";
  function messageFor(el) {
    const v = el.validity;
    if (v.valueMissing) return el.type === "checkbox" ? "Tick this box to continue." : "Please fill in this field.";
    if (v.typeMismatch && el.type === "email") return "Enter an email address like name@example.com.";
    if (v.typeMismatch && el.type === "url") return "Enter a full web address starting with https://.";
    if (v.typeMismatch && el.type === "tel") return "Enter a valid phone number.";
    if (v.tooShort) return "Use at least " + el.minLength + " characters.";
    if (v.tooLong) return "Use no more than " + el.maxLength + " characters.";
    if (v.patternMismatch) return el.title || "Check the format of this entry.";
    if (v.rangeUnderflow || v.rangeOverflow || v.stepMismatch) return "Enter a value within the allowed range.";
    return el.validationMessage || "Please check this field.";
  }
  function errorId(el) {
    return "err-" + (el.id || el.name || "field").replace(/[^\w-]/g, "-");
  }
  function show(el, first) {
    el.setAttribute("aria-invalid", "true");
    const id = errorId(el);
    let note = document.getElementById(id);
    if (!note) {
      note = document.createElement("span");
      note.id = id;
      note.className = "field-error-msg";
      el.insertAdjacentElement("afterend", note);
    }
    note.textContent = messageFor(el);
    const described = (el.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    if (!described.includes(id)) described.push(id);
    el.setAttribute("aria-describedby", described.join(" "));
    if (first) el.focus();
  }
  function clear(el) {
    if (!el || el.getAttribute?.("aria-invalid") !== "true") return;
    el.removeAttribute("aria-invalid");
    const id = errorId(el);
    document.getElementById(id)?.remove();
    const described = (el.getAttribute("aria-describedby") || "").split(" ").filter((x) => x && x !== id);
    if (described.length) el.setAttribute("aria-describedby", described.join(" "));
    else el.removeAttribute("aria-describedby");
  }
  document.addEventListener(
    "invalid",
    (event) => {
      const el = event.target;
      if (!(el instanceof HTMLElement) || el.type === "hidden") return;
      event.preventDefault();
      const form = el.form;
      const first = !form || !form.querySelector('[aria-invalid="true"]');
      show(el, first);
    },
    true,
  );
  document.addEventListener("input", (event) => clear(event.target), true);
  document.addEventListener("change", (event) => clear(event.target), true);
  // Make sure any server-side error text stands out as an error, not a status note.
  document.addEventListener("submit", () => {
    document.querySelectorAll(".field-error-msg").forEach((n) => n.setAttribute("role", "alert"));
  }, true);
  const style = document.createElement("style");
  style.textContent =
    ".field-error-msg{display:block;margin-top:6px;color:" + RED + ";font-size:14px;line-height:1.4;font-weight:600}" +
    '[aria-invalid="true"]{border-color:' + RED + " !important;box-shadow:0 0 0 3px rgba(180,35,24,.15)}";
  document.head.appendChild(style);
})();
