import { Chess } from "/vendor/chess.js";
const $ = (s) => document.querySelector(s),
  main = $("#main");
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let user = null,
  authMode = "login",
  playMode = "puzzle",
  game = new Chess(),
  selected = null,
  currentState = null,
  socket = null,
  color = "w",
  busy = false,
  matched = false,
  playToken = 0;
async function api(path, body) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Please try again.");
  return data;
}
const pageHeader = (label, title, desc) =>
  `<section class="page-header"><div class="container"><div class="eyebrow">${label}</div><h1>${title}</h1><p>${desc}</p></div></section>`;
const home =
  () => `<section class="hero"><div class="container hero-inner"><div><div class="eyebrow">KERICHO, KENYA · A COMMUNITY OF CHESS</div><h1>Small moves.<br><em>Brighter futures.</em></h1><p>A place to learn, a community to belong to, and a board full of possibilities. Discover your next move with Kericho Chess Club &amp; Academy.</p><div class="buttons"><a class="button gold" href="/registration" data-route>Join the academy <span>↗</span></a><a class="text-link" href="/about" data-route>Get to know us <span>→</span></a></div></div><div class="hero-image"><img src="/assets/coaching-session.jpg" alt="Chess coaching at Kericho Chess Academy" fetchpriority="high"><div class="image-label"><span aria-hidden="true">♞</span>More than a game. A way to grow.</div></div></div></section>
<section class="intro-strip"><div class="container strip-inner"><p>Every great player starts with a first move.</p><div class="pill-list"><span>All skill levels</span><span>Young minds welcome</span><span>Community first</span></div></div></section>
<section class="container section"><div class="section-heading"><div><div class="eyebrow">FIND YOUR NEXT MOVE</div><h2>Your chess journey starts here.</h2></div><p>Less searching, more playing. Everything you need to get involved, in one place.</p></div><div class="cards"><article class="card"><span class="card-icon" aria-hidden="true">♟</span><h3>Become a member</h3><p>Join our chess community. Find the membership and parent consent forms on our registration page.</p><a class="text-link" href="/registration" data-route>Explore registration <span>↗</span></a></article><article class="card"><span class="card-icon" aria-hidden="true">▦</span><h3>See what’s coming</h3><p>Follow upcoming tournaments and academy events. Opt in for updates so you don’t miss a move.</p><a class="text-link" href="/events" data-route>Upcoming events <span>↗</span></a></article><article class="card"><span class="card-icon" aria-hidden="true">♞</span><h3>Put your mind to play</h3><p>A daily puzzle for everyone. Log in to practise against the computer or find an online opponent.</p><a class="text-link" href="/play" data-route>Visit the chess room <span>↗</span></a></article></div></section>
<div class="container"><section class="feature-band"><div><div class="eyebrow">A LITTLE CHALLENGE, EVERY DAY</div><h3>One board. One puzzle. Your move.</h3><p>Take a moment to sharpen your thinking with our puzzle of the day.</p></div><a class="button" href="/play" data-route>Try today’s puzzle <span>→</span></a></section></div>`;
const about = () =>
  pageHeader(
    "THE PEOPLE & THE PURPOSE",
    "More than a chess club.",
    "We bring people together through chess — building confidence, thoughtful decision-making and a love of the game in Kericho.",
  ) +
  `<section class="container section two-column"><img class="about-image" src="/assets/hero-chess-academy.jpg" alt="Chess at the academy"><div class="body-copy"><div class="eyebrow">OUR COMMUNITY</div><h2>Growing together,<br>one move at a time.</h2><p>Kericho Chess Club &amp; Academy is a home for players who want to learn, practise and connect. Our academy offers coaching, school chess clubs and opportunities to take part in chess events.</p><p>Whether you are discovering the pieces or preparing for your next tournament, our focus is the same: steady learning, fair play and a supportive community.</p><a class="text-link" href="/registration" data-route>Be part of our story ↗</a></div></section><section class="container section" style="padding-top:0"><div class="section-heading"><div><div class="eyebrow">MEET OUR OFFICIALS</div><h2>The people behind the moves.</h2></div><p>Club leadership supporting our players, families and chess community.</p></div><div class="leaders"><article class="profile"><img src="/assets/leadership/president-shem-meso.jpg" alt="Shem Meso" loading="lazy"><div class="profile-content"><div class="role">President</div><h3>Shem Meso</h3><p>As president, Shem represents the club’s leadership and provides a point of contact for academy enquiries and parent photo/video consent. His role supports the club’s direction and its relationship with players and families.</p></div></article><article class="profile"><img src="/assets/leadership/vice-chairperson-barnabas-ochieng.jpg" alt="Barnabas Ochieng" loading="lazy"><div class="profile-content"><div class="role">Vice Chairperson</div><h3>Barnabas Ochieng</h3><p>As vice chairperson, Barnabas supports the club’s leadership and helps keep the community’s work moving forward. The role provides support to the chair and contributes to the coordination of club activities.</p></div></article></div></section>`;
const forms = {
  membership: {
    title: "Academy membership",
    id: "1FAIpQLSdbieIfMBN_VQPdNGKFHh1rPMa_JFpRZUUhkHEEU92DbUgJGw",
    steps: [
      "Complete your personal details in the membership form.",
      "Verify your email — it is the primary channel for membership communication.",
      "Choose Pay Now or Pay Later at the form’s checkout. Membership remains inactive until paid.",
      "After processing, you receive confirmation and a Membership ID.",
    ],
    note: "The form states that Pay Now membership is active until 31 December 2026. Membership includes access to association AGMs, national events and subsidies for club-sanctioned events. Fees are presented in the form; this website does not collect payment.",
  },
  consent: {
    title: "Photo & video consent",
    id: "1FAIpQLSefyh1CBlzc_YsCPh9dp8oNl9dcBPjr4cNvjET8ob4ndaodzw",
    steps: [
      "A parent or guardian completes one form for each child.",
      "Review internal uses, including coaching review and club records.",
      "Review publicity uses such as the website, social media and tournament reports.",
      "Give separate permission for using a child’s name. Consent can be changed or withdrawn in writing.",
    ],
    note: "You may request a review of publicity images. Future use can be stopped and images removed where possible; printed materials or third-party shares cannot always be recalled.",
  },
};
const registration = () =>
  pageHeader(
    "JOIN OUR COMMUNITY",
    "Make your first move.",
    "Complete membership registration and, for children, the parent or guardian consent form. Both official forms are available right here.",
  ) +
  `<section class="container section"><div class="tabs" role="tablist" aria-label="Registration forms"><button class="tab" role="tab" id="tab-membership" data-form="membership" aria-selected="true" aria-controls="registration-content">Academy membership</button><button class="tab" role="tab" id="tab-consent" data-form="consent" aria-selected="false" aria-controls="registration-content" tabindex="-1">Photo &amp; video consent</button></div><div id="registration-content" role="tabpanel" aria-labelledby="tab-membership"></div><p class="notice">Academy membership and a website play account are separate. The forms are hosted by Google and sent directly to the form owner. The website cannot verify a submission or payment, or issue a Membership ID.</p></section>`;
function loadForm(type) {
  const f = forms[type];
  $("#registration-content").setAttribute("aria-labelledby", "tab-" + type);
  $("#registration-content").innerHTML =
    `<div class="registration-layout"><aside class="registration-note"><div class="eyebrow">BEFORE YOU BEGIN</div><h3>${f.title}</h3><ol>${f.steps.map((s) => `<li>${s}</li>`).join("")}</ol><p class="fineprint">${f.note}</p></aside><div class="embed-wrap"><iframe title="${f.title} official form" src="https://docs.google.com/forms/d/e/${f.id}/viewform?embedded=true" loading="lazy" referrerpolicy="strict-origin-when-cross-origin">Loading official form…</iframe><div class="embed-fallback">If the embedded form does not load, <a href="https://docs.google.com/forms/d/e/${f.id}/viewform" target="_blank" rel="noopener">open the official form in a new tab ↗</a>.</div></div></div>`;
  document.querySelectorAll("[data-form]").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.form === type);
    b.tabIndex = b.dataset.form === type ? 0 : -1;
  });
}
const events = () =>
  pageHeader(
    "ON THE CALENDAR",
    "Good things are coming.",
    "Find confirmed academy events and tournament opportunities here. Turn on optional notifications to hear when new dates are announced.",
  ) +
  `<section class="container section"><div id="events-list"><p class="muted" role="status">Loading upcoming events…</p></div><div class="push-card"><div><div class="eyebrow" style="color:#e5bb72">STAY ONE MOVE AHEAD</div><h3>Updates, only when you want them.</h3><p>Opt in to browser notifications for event and registration reminders. Permission is optional; you can disable notifications at any time. Google Form submissions do not automatically trigger a notification.</p></div><div class="notification-status"><button class="button gold" id="push-button">Enable notifications <span>↗</span></button><p id="push-status" class="form-status" role="status"></p></div></div></section>`;
async function loadEvents() {
  try {
    const list = await api("events");
    if (!$("#events-list")) return;
    $("#events-list").innerHTML = list.length
      ? `<div class="cards">${list.map((e) => `<article class="card event-card"><div class="event-date">${escape(e.date)} · ${escape(e.location || "Venue to be confirmed")}</div><h3>${escape(e.title)}</h3><p>${escape(e.description)}</p><a class="text-link" href="/registration" data-route>Go to registration ↗</a></article>`).join("")}</div>`
      : `<div class="empty-state"><div class="card-icon" aria-hidden="true">▦</div><h3>Next event: to be announced.</h3><p>No upcoming dates have been confirmed on the website yet. Check back soon or contact the academy to ask about the next session.</p><div class="contact-icons" style="justify-content:center"><a href="tel:+254729037585" aria-label="Call about events" title="Call about events">☎</a><a href="mailto:kerichochessacademy@gmail.com?subject=Upcoming%20events" aria-label="Email about events" title="Email about events">✉</a></div></div>`;
  } catch (e) {
    if ($("#events-list"))
      $("#events-list").innerHTML = `<p role="alert">${escape(e.message)}</p>`;
  }
}
const faq = [
  [
    "Who can join the academy?",
    "Players at different experience levels are welcome. Contact the academy to discuss age-appropriate coaching and the right starting point.",
  ],
  [
    "How do I register for membership?",
    "Open Registration, select Academy membership and complete the official form. Verify your email and follow the payment instructions. The academy sends a Membership ID once your application is processed.",
  ],
  [
    "Do I need to pay immediately?",
    "The membership form offers Pay Now and Pay Later. Membership remains inactive until the fee is paid, including when a club pays on your behalf. The fee is displayed in the official form.",
  ],
  [
    "Why is there a photo and video consent form?",
    "Parents or guardians can review and choose permission for the use of their child’s images in coaching, club records and publicity. Complete one form per child. Name permissions are separate. Consent can be changed or withdrawn in writing.",
  ],
  [
    "Do I need an account to play?",
    "Yes, computer games and online matchmaking require a website account. The daily puzzle is open to everyone. Website accounts are separate from academy membership and do not confirm a paid membership.",
  ],
  [
    "How does online play work?",
    "Log in, choose Online opponent and join the queue. You are matched with a different logged-in player when one joins. Use a nickname and keep your account private. Games are untimed; leaving or disconnecting ends the live session.",
  ],
  [
    "How does the daily puzzle change?",
    "The puzzle changes at midnight in Nairobi time. It rotates through a small curated set of mate-in-one challenges. Select a piece, then its destination square.",
  ],
  [
    "Can I turn off notifications?",
    "Yes. Use Disable notifications on the Events page or revoke permission in your browser’s site settings. Notifications are optional, and not every browser supports them.",
  ],
  [
    "What happens to my feedback?",
    "Feedback is stored privately for academy review. Do not include passwords, payment details or children’s personal information. For an urgent question or a reply, use the call or email icon.",
  ],
];
const help = () =>
  pageHeader(
    "A LITTLE HELP GOES A LONG WAY",
    "Questions? We’re here.",
    "Find answers to the essentials, or share an idea to help us make the academy website better.",
  ) +
  `<section class="container section two-column"><div class="faq"><div class="eyebrow">FREQUENTLY ASKED QUESTIONS</div>${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div><section class="feedback-card"><div class="eyebrow">YOUR VOICE MATTERS</div><h2>Leave us feedback.</h2><p>A suggestion, a question or something not working? Tell us about it. For a personal reply, contact the academy using the icons below.</p><form id="feedback-form"><label>What is your feedback about?<select name="category"><option>Suggestion</option><option>Question</option><option>Issue</option></select></label><label>Your message<textarea name="message" minlength="10" maxlength="3000" required placeholder="What would you like us to know?"></textarea></label><p class="fineprint">Please do not include sensitive or personal information. Feedback is stored for private review by the academy.</p><p class="form-status" id="feedback-status" role="status"></p><button class="button" type="submit">Send feedback <span>↗</span></button></form><div class="contact-icons" style="margin-top:25px"><a href="tel:+254729037585" title="Call the academy" aria-label="Call the academy">☎</a><a href="mailto:kerichochessacademy@gmail.com" title="Email the academy" aria-label="Email the academy">✉</a></div></section></section>`;
const play = () =>
  pageHeader(
    "THE CHESS ROOM",
    "Think. Play. Repeat.",
    "Solve today’s challenge, practise at your own pace, or share a board with another member of the community.",
  ) +
  `<section class="container section"><div class="tabs" role="tablist" aria-label="Chess mode">${[
    ["puzzle", "Puzzle of the day"],
    ["computer", "Play the computer"],
    ["online", "Online opponent"],
  ]
    .map(
      ([m, t]) =>
        `<button class="tab" role="tab" id="play-tab-${m}" data-mode="${m}" aria-controls="play-content" aria-selected="${m === playMode}" tabindex="${m === playMode ? 0 : -1}">${t}</button>`,
    )
    .join(
      "",
    )}</div><div class="play-layout" id="play-content" role="tabpanel" aria-labelledby="play-tab-${playMode}"><div class="board-shell"><div class="board-top"><span id="board-label">Today’s challenge</span><span id="board-side">White to move</span></div><div class="chessboard" id="board" role="group" aria-label="Chess board"></div><p class="board-status" id="board-status" role="status">Loading…</p></div><div class="play-panel" id="play-panel"></div></div></section>`;
function updateAccount() {
  $("#account-button").textContent = user ? "Log out" : "Log in ↗";
}
function cleanup() {
  playToken++;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  matched = false;
  busy = false;
}
async function render(focus = false) {
  cleanup();
  const route = location.pathname;
  const pages = {
    "/": home,
    "/about": about,
    "/registration": registration,
    "/events": events,
    "/play": play,
    "/help": help,
  };
  main.innerHTML = (pages[route] || home)();
  const names = {
    "/": "Home",
    "/about": "About Us",
    "/registration": "Registration",
    "/events": "Events",
    "/play": "Play Chess",
    "/help": "FAQs & Feedback",
  };
  document.title = `${names[route] || "Home"} · Kericho Chess Club & Academy`;
  document.querySelectorAll("nav [data-route]").forEach((a) => {
    if (a.getAttribute("href") === route)
      a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("#navigation").classList.remove("open");
  $(".menu-toggle").setAttribute("aria-expanded", "false");
  if (route === "/registration") loadForm("membership");
  if (route === "/events") {
    loadEvents();
    pushState();
  }
  if (route === "/play") initPlay();
  if (focus) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-route]");
  if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    history.pushState({}, "", a.getAttribute("href"));
    render(true);
  }
  const tab = e.target.closest("[data-form]");
  if (tab) loadForm(tab.dataset.form);
  const mode = e.target.closest("[data-mode]");
  if (mode) {
    cleanup();
    playMode = mode.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.setAttribute("aria-selected", b === mode);
      b.tabIndex = b === mode ? 0 : -1;
    });
    $("#play-content").setAttribute("aria-labelledby", "play-tab-" + playMode);
    initPlay();
  }
  if (e.target.closest("[data-auth]")) openAuth();
});
document.addEventListener("keydown", (e) => {
  if (
    !e.target.matches("[role=tab]") ||
    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
  )
    return;
  e.preventDefault();
  const tabs = [...e.target.parentElement.querySelectorAll("[role=tab]")],
    i = tabs.indexOf(e.target);
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? tabs.length - 1
        : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
});
window.addEventListener("popstate", () => render(true));
$(".menu-toggle").onclick = () => {
  const open = $("#navigation").classList.toggle("open");
  $(".menu-toggle").setAttribute("aria-expanded", open);
};
function openAuth() {
  $("#auth-error").textContent = "";
  $("#auth-dialog").showModal();
}
$(".dialog-close").onclick = () => $("#auth-dialog").close();
$("#auth-dialog").addEventListener("click", (e) => {
  if (e.target === $("#auth-dialog")) {
    const rect = e.target.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      e.target.close();
  }
});
$("#account-button").onclick = async () => {
  if (!user) return openAuth();
  try {
    await api("logout", {});
    user = null;
    updateAccount();
    if (location.pathname === "/play") render();
  } catch (e) {
    openAuth();
    $("#auth-error").textContent = e.message;
  }
};
$("#auth-switch").onclick = () => {
  authMode = authMode === "login" ? "register" : "login";
  const register = authMode === "register";
  $("#name-label").hidden = !register;
  $("#auth-form").elements.name.required = register;
  $("#auth-title").textContent = register
    ? "Join the chess room."
    : "Welcome back.";
  $("#auth-submit").textContent = register ? "Create account" : "Log in";
  $("#auth-switch").textContent = register
    ? "Already registered? Log in"
    : "New here? Create an account";
  $("#auth-form").elements.password.autocomplete = register
    ? "new-password"
    : "current-password";
  $("#auth-error").textContent = "";
};
$("#auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const button = $("#auth-submit");
  button.disabled = true;
  $("#auth-error").textContent = "Please wait…";
  try {
    const data = await api(
      authMode,
      Object.fromEntries(new FormData(e.target)),
    );
    user = data.user;
    updateAccount();
    $("#auth-dialog").close();
    e.target.reset();
    if (location.pathname === "/play") render();
  } catch (err) {
    $("#auth-error").textContent = err.message;
  } finally {
    button.disabled = false;
  }
};
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "feedback-form") return;
  e.preventDefault();
  const form = e.target,
    button = form.querySelector("button");
  button.disabled = true;
  const status = $("#feedback-status");
  try {
    await api("feedback", Object.fromEntries(new FormData(form)));
    status.textContent =
      "Thank you — your feedback has been saved for academy review.";
    form.reset();
  } catch (err) {
    status.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});
function setStatus(text) {
  if ($("#board-status")) $("#board-status").textContent = text;
}
function paintBoard() {
  if (!$("#board")) return;
  const reverse = playMode === "online" && color === "b";
  const squares = game.board().flat();
  if (reverse) squares.reverse();
  $("#board").innerHTML = squares
    .map((p, i) => {
      const row = reverse ? 7 - Math.floor(i / 8) : Math.floor(i / 8),
        col = reverse ? 7 - (i % 8) : i % 8,
        square = "abcdefgh"[col] + (8 - row),
        piece = p
          ? `${p.color === "w" ? "White" : "Black"} ${{ p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[p.type]}`
          : "empty";
      let legal = false;
      try {
        legal =
          selected &&
          game
            .moves({ square: selected, verbose: true })
            .some((m) => m.to === square);
      } catch {}
      return `<button class="square ${(row + col) % 2 ? "dark" : ""} ${selected === square ? "selected" : ""} ${legal ? "legal" : ""}" data-square="${square}" aria-label="${square}, ${piece}${legal ? ", legal destination" : ""}" ${selected === square ? 'aria-pressed="true"' : ""}>${p ? `<img src="/assets/pieces/${p.color}${p.type}.png" alt="">` : ""}${col === 0 || row === 7 ? `<span class="coordinate">${square}</span>` : ""}</button>`;
    })
    .join("");
  $("#board-side").textContent =
    (game.turn() === "w" ? "White" : "Black") + " to move";
}
function applyState(state) {
  currentState = state;
  game.load(state.fen);
  selected = null;
  paintBoard();
  setStatus(state.status);
  if ($("#moves"))
    $("#moves").textContent = state.history.length
      ? state.history
          .map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m))
          .join(" ")
      : "Your moves will appear here.";
  if (state.over) {
    busy = true;
    if (playMode === "online" && $("#start-game"))
      $("#start-game").disabled = false;
  }
}
async function initPlay() {
  const token = ++playToken;
  selected = null;
  busy = true;
  matched = false;
  color = "w";
  currentState = null;
  game.reset();
  paintBoard();
  const panel = $("#play-panel");
  if (playMode === "puzzle") {
    panel.innerHTML = `<div class="eyebrow">DAILY PRACTICE</div><h2>Find the finishing move.</h2><p>Mate in one. Select a piece, then the square you want to move to. This small puzzle collection rotates daily at midnight in Nairobi.</p><div class="buttons"><button class="button outline" id="hint-button">Show a hint</button><button class="button outline" id="reset-puzzle">Try again</button></div><p id="puzzle-hint" role="status"></p>`;
    try {
      const p = await api("puzzle");
      if (token !== playToken) return;
      game.load(p.fen);
      color = game.turn();
      busy = false;
      $("#board-label").textContent = p.date + " · Nairobi";
      setStatus(
        `${color === "w" ? "White" : "Black"} to move. Find checkmate in one.`,
      );
      paintBoard();
      $("#hint-button").onclick = () =>
        ($("#puzzle-hint").textContent = p.hint);
      $("#reset-puzzle").onclick = () => initPlay();
    } catch (e) {
      if (token === playToken) setStatus(e.message);
    }
    return;
  }
  if (!user) {
    panel.innerHTML = `<div class="eyebrow">MEMBERS’ CHESS ROOM</div><h2>${playMode === "computer" ? "Your practice partner." : "A shared board."}</h2><p>${playMode === "computer" ? "Practise against our beginner-friendly computer. All moves follow standard chess rules." : "Match with another logged-in player who is waiting online."}</p><div class="gate"><h3>Log in to make your move.</h3><p>Create a free website play account or log in. Academy membership is registered separately.</p><button class="button" data-auth>Log in / create account ↗</button></div>`;
    $("#board-label").textContent = "Log in to play";
    setStatus(
      "Computer and online games require a login. The daily puzzle is open to everyone.",
    );
    return;
  }
  const online = playMode === "online";
  panel.innerHTML = `<div class="eyebrow">${online ? "PLAY TOGETHER" : "PRACTISE AT YOUR PACE"}</div><h2>${online ? "Find your next opponent." : "Meet your practice partner."}</h2><p>${online ? "Join the queue to match with another logged-in player. Waiting times depend on who is online. Leaving this page ends your live game." : "You play White. This beginner computer considers captures and immediate replies — a friendly starting point, not a tournament-strength engine."}</p><p id="opponent" class="connection-note">Logged in as ${escape(user.name)}.</p><div class="buttons"><button class="button" id="start-game">${online ? "Find an opponent" : "New game"}</button>${online ? '<button class="button outline" id="cancel-queue" hidden>Cancel search</button>' : ""}</div><label style="margin-top:20px">Pawn promotion<select id="promotion"><option value="q">Queen</option><option value="r">Rook</option><option value="b">Bishop</option><option value="n">Knight</option></select></label><div class="move-list" id="moves">Your moves will appear here.</div>`;
  $("#start-game").onclick = () => (online ? findOpponent() : startComputer());
  $("#board-label").textContent = online ? "Online chess" : "Computer chess";
  if (online) {
    setStatus("Ready to find an opponent.");
    $("#cancel-queue").onclick = () => {
      socket?.emit("cancel");
      $("#cancel-queue").hidden = true;
      $("#start-game").disabled = false;
      setStatus("Search cancelled.");
    };
  } else startComputer();
}
async function startComputer() {
  busy = true;
  const token = playToken;
  try {
    const state = await api("computer", {});
    if (token !== playToken) return;
    busy = false;
    applyState(state);
  } catch (e) {
    if (token === playToken) setStatus(e.message);
  }
}
function findOpponent() {
  socket?.disconnect();
  socket = io({ transports: ["websocket", "polling"], reconnection: false });
  busy = true;
  matched = false;
  $("#start-game").disabled = true;
  $("#cancel-queue").hidden = false;
  setStatus("Connecting…");
  socket.on("connect", () => socket.emit("queue"));
  socket.on("waiting", () =>
    setStatus(
      "Waiting for another player. Ask a friend to log in and join the queue.",
    ),
  );
  socket.on("matched", (state) => {
    matched = true;
    color = state.color;
    busy = false;
    $("#cancel-queue").hidden = true;
    $("#opponent").textContent =
      "Playing " +
      state.opponent +
      ". You are " +
      (color === "w" ? "White." : "Black.");
    applyState(state);
  });
  socket.on("state", (state) => {
    busy = false;
    applyState(state);
  });
  socket.on("moveError", (text) => {
    busy = false;
    setStatus(text);
  });
  socket.on("opponentLeft", () => {
    busy = true;
    matched = false;
    setStatus("Your opponent disconnected. This live game has ended.");
    $("#start-game").disabled = false;
    $("#cancel-queue").hidden = true;
  });
  socket.on("connect_error", () => {
    setStatus("Unable to connect. Please log in again or retry.");
    $("#start-game").disabled = false;
    $("#cancel-queue").hidden = true;
  });
  socket.on("disconnect", () => {
    if (location.pathname === "/play" && playMode === "online") {
      busy = true;
      matched = false;
      setStatus("Connection ended. Start a new search to play again.");
      $("#start-game").disabled = false;
      $("#cancel-queue").hidden = true;
    }
  });
}
document.addEventListener("click", async (e) => {
  const square = e.target.closest("[data-square]")?.dataset.square;
  if (
    !square ||
    busy ||
    game.isGameOver() ||
    (playMode !== "puzzle" && (!user || game.turn() !== color)) ||
    (playMode === "online" && !matched)
  )
    return;
  const piece = game.get(square);
  if (piece && piece.color === game.turn()) {
    selected = square;
    paintBoard();
    return;
  }
  if (!selected) return;
  const from = selected;
  const legal = game
    .moves({ square: from, verbose: true })
    .some((m) => m.to === square);
  if (!legal) {
    setStatus("That move is not legal. Select a highlighted destination.");
    return;
  }
  const move = { from, to: square, promotion: $("#promotion")?.value || "q" };
  busy = true;
  const token = playToken;
  try {
    if (playMode === "puzzle") {
      const result = await api("puzzle", move);
      if (token !== playToken) return;
      if (result.solved) {
        applyState(result);
        setStatus(
          "Well done — checkmate! Come back for the next daily challenge.",
        );
      } else {
        busy = false;
        selected = null;
        paintBoard();
        setStatus("A legal move, but not checkmate. Try another move.");
      }
    } else if (playMode === "computer") {
      const state = await api("computer/move", move);
      if (token !== playToken) return;
      busy = false;
      applyState(state);
    } else {
      selected = null;
      paintBoard();
      socket.emit("move", move);
    }
  } catch (err) {
    if (token === playToken) {
      busy = false;
      setStatus(err.message);
    }
  }
});
async function pushState() {
  if (!$("#push-button")) return;
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    const b = $("#push-button");
    b.disabled = true;
    $("#push-status").textContent =
      "This browser does not support push notifications. Check this page for updates.";
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    if ($("#push-button")) {
      $("#push-button").textContent = sub
        ? "Disable notifications"
        : "Enable notifications ↗";
      $("#push-button").dataset.subscribed = !!sub;
    }
  } catch {
    if ($("#push-status"))
      $("#push-status").textContent =
        "Notifications require HTTPS and a supported browser.";
  }
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#push-button")) return;
  const button = $("#push-button"),
    status = $("#push-status");
  button.disabled = true;
  try {
    if (!window.isSecureContext)
      throw Error("Notifications require a secure HTTPS connection.");
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    const old = await reg.pushManager.getSubscription();
    if (old) {
      await api("push/unsubscribe", { endpoint: old.endpoint });
      await old.unsubscribe();
      status.textContent = "Notifications disabled.";
      button.textContent = "Enable notifications ↗";
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw Error(
          "Notifications are not allowed. You can change this in your browser’s site settings.",
        );
      const { key } = await api("push/key");
      const bytes = Uint8Array.from(
        atob(key.replace(/-/g, "+").replace(/_/g, "/")),
        (c) => c.charCodeAt(0),
      );
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      });
      try {
        await api("push/subscribe", sub.toJSON());
      } catch (err) {
        await sub.unsubscribe();
        throw err;
      }
      status.textContent =
        "You’re subscribed to academy event and registration updates.";
      button.textContent = "Disable notifications";
    }
  } catch (err) {
    status.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});
$("#year").textContent = new Date().getFullYear();
try {
  user = (await api("me")).user;
} catch {}
updateAccount();
render();
