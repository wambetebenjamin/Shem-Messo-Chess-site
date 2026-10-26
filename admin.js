// Admin dashboard. Only the server decides who is an admin; this page just shows or hides tools.
const $ = (selector) => document.querySelector(selector);

async function api(method, path, body) {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!response.ok) throw Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function setMsg(node, text, tone = "") {
  node.textContent = text;
  node.className = "admin-msg " + tone;
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text == null || text === "" ? "—" : String(text);
  return td;
}

function formatDate(value) {
  const parsed = new Date(String(value).length === 10 ? value + "T12:00:00+03:00" : value);
  return Number.isNaN(parsed.getTime())
    ? String(value ?? "—")
    : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeZone: "Africa/Nairobi" }).format(parsed);
}

function formatTime(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(parsed);
}

// ---- Sign-in gate ----
async function start() {
  let user = null;
  try {
    user = (await api("GET", "me")).user;
  } catch {
    $("#gate-message").textContent = "Could not reach the server. Please refresh the page.";
    return;
  }
  if (user?.admin) return showDashboard();
  if (user) {
    $("#gate-message").textContent = "This account does not have admin access.";
    return;
  }
  $("#gate-message").textContent = "Sign in with an admin email to continue.";
  $("#admin-login").hidden = false;
}

$("#admin-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = form.querySelector(".admin-msg");
  try {
    const data = await api("POST", "login", Object.fromEntries(new FormData(form)));
    if (!data.user?.admin) {
      setMsg(msg, "This account does not have admin access.", "error");
      await api("POST", "logout", {}).catch(() => {});
      return;
    }
    showDashboard();
  } catch (error) {
    setMsg(msg, error.message, "error");
  }
});

function showDashboard() {
  $("#gate").hidden = true;
  $("#dashboard").hidden = false;
  $("#logout").hidden = false;
  loadAll();
}

$("#logout").addEventListener("click", async () => {
  await api("POST", "logout", {}).catch(() => {});
  location.reload();
});

// ---- Events ----
let events = [];

function resetEventForm() {
  const form = $("#event-form");
  form.reset();
  form.elements.id.value = "";
  form.elements.entryFee.value = "0";
  form.elements.published.checked = true;
  $("#event-cancel").hidden = true;
  setMsg($("#event-msg"), "");
}

function fillEventForm(event) {
  const form = $("#event-form");
  form.elements.id.value = event.id;
  form.elements.title.value = event.title;
  form.elements.date.value = event.date;
  form.elements.startTime.value = event.startTime || "";
  form.elements.location.value = event.location || "";
  form.elements.entryFee.value = event.entryFee || 0;
  form.elements.registrationUrl.value = event.registrationUrl || "";
  form.elements.description.value = event.description || "";
  form.elements.published.checked = Boolean(event.published);
  $("#event-cancel").hidden = false;
  setMsg($("#event-msg"), "Editing: " + event.title);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadEvents() {
  events = await api("GET", "admin/events");
  const tbody = $("#event-rows");
  tbody.replaceChildren();
  if (!events.length) {
    const tr = document.createElement("tr");
    const td = cell("No events yet. Add one above.");
    td.colSpan = 5;
    tr.append(td);
    tbody.append(tr);
  }
  for (const event of events) {
    const tr = document.createElement("tr");
    const actions = document.createElement("td");
    actions.className = "admin-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => fillEventForm(event));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
      try {
        await api("DELETE", "admin/events/" + event.id);
        await loadEvents();
        resetEventForm();
        setMsg($("#event-msg"), "Event deleted.", "ok");
      } catch (error) {
        setMsg($("#event-msg"), error.message, "error");
      }
    });
    actions.append(edit, remove);
    tr.append(
      cell(formatDate(event.date) + (event.startTime ? " · " + event.startTime : "")),
      cell(event.title),
      cell(event.entryFee ? "KES " + event.entryFee : "Free"),
      cell(event.published ? "Yes" : "No (hidden)"),
      actions,
    );
    tbody.append(tr);
  }
}

$("#event-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const payload = {
    title: data.title,
    date: data.date,
    startTime: data.startTime,
    location: data.location,
    entryFee: data.entryFee,
    registrationUrl: data.registrationUrl,
    description: data.description,
    published: form.elements.published.checked,
  };
  const msg = $("#event-msg");
  try {
    if (data.id) await api("PUT", "admin/events/" + data.id, payload);
    else await api("POST", "admin/events", payload);
    resetEventForm();
    await loadEvents();
    setMsg(msg, "Event saved. It is live on the events page now.", "ok");
  } catch (error) {
    setMsg(msg, error.message, "error");
  }
});
$("#event-cancel").addEventListener("click", resetEventForm);

// ---- Announcement ----
async function loadAnnouncement() {
  const data = await api("GET", "content/announcement");
  const form = $("#announce-form");
  form.elements.text.value = data.text || "";
  form.elements.show.checked = Boolean(data.show);
}

$("#announce-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = $("#announce-msg");
  try {
    await api("PUT", "admin/content/announcement", {
      text: form.elements.text.value,
      show: form.elements.show.checked,
    });
    setMsg(msg, "Announcement saved.", "ok");
  } catch (error) {
    setMsg(msg, error.message, "error");
  }
});

// ---- Bookings (status buttons) ----
const statusLabels = {
  requested: "Requested",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

async function loadBookings() {
  const rows = await api("GET", "admin/bookings");
  const tbody = $("#booking-rows");
  tbody.replaceChildren();
  if (!rows.length) tbody.append(emptyRow(8, "No bookings yet."));
  for (const row of rows) {
    const tr = document.createElement("tr");
    const statusCell = document.createElement("td");
    const current = document.createElement("p");
    current.textContent = statusLabels[row.status] || row.status;
    const buttons = document.createElement("div");
    buttons.className = "admin-actions";
    for (const [status, label] of Object.entries(statusLabels)) {
      if (status === row.status) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", async () => {
        try {
          await api("POST", `admin/bookings/${row.id}/status`, { status });
          await loadBookings();
        } catch (error) {
          alert(error.message);
        }
      });
      buttons.append(button);
    }
    statusCell.append(current, buttons);
    tr.append(
      cell(row.preferredDate),
      cell(row.timeSlot),
      cell(row.name),
      cell(row.sessionType),
      cell(row.contact),
      cell(row.level),
      cell(row.notes),
      statusCell,
    );
    tbody.append(tr);
  }
}

// ---- Read-only lists ----
function emptyRow(columns, text) {
  const tr = document.createElement("tr");
  const td = cell(text);
  td.colSpan = columns;
  tr.append(td);
  return tr;
}

async function loadGroups() {
  const rows = await api("GET", "admin/group-registrations");
  const tbody = $("#group-rows");
  tbody.replaceChildren();
  if (!rows.length) tbody.append(emptyRow(6, "No group registrations yet."));
  for (const row of rows) {
    const players = Array.isArray(row.players)
      ? row.players
          .map((p) => [p?.name, p?.level].filter(Boolean).join(" – "))
          .join("; ")
      : "";
    const tr = document.createElement("tr");
    tr.append(
      cell(formatTime(row.created)),
      cell(row.contactName),
      cell(row.contact),
      cell(players),
      cell(row.notes),
      cell(row.status),
    );
    tbody.append(tr);
  }
}

async function loadPayments() {
  const rows = await api("GET", "admin/payments");
  const tbody = $("#payment-rows");
  tbody.replaceChildren();
  if (!rows.length) tbody.append(emptyRow(7, "No payments yet."));
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.append(
      cell(formatTime(row.created)),
      cell(row.item),
      cell(row.amount),
      cell(row.phone),
      cell(row.status),
      cell(row.receipt),
      cell(row.resultDesc),
    );
    tbody.append(tr);
  }
}

async function loadAll() {
  const jobs = [
    ["events", loadEvents],
    ["announcement", loadAnnouncement],
    ["bookings", loadBookings],
    ["group registrations", loadGroups],
    ["payments", loadPayments],
  ];
  const results = await Promise.allSettled(jobs.map(([, job]) => job()));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? jobs[i][0] : null))
    .filter(Boolean);
  if (failed.length) alert("Could not load: " + failed.join(", ") + ". Please refresh the page.");
}

start();
