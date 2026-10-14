// All API and socket requests are same-origin. Static hosts get an honest service-unavailable message.
const $ = (selector) => document.querySelector(selector);
const serviceError =
  "This feature needs the academy’s Node.js service. It is not available on a static-only host such as GitHub Pages.";
async function api(path, body) {
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw Error(serviceError);
  const data = await response.json();
  if (!response.ok)
    throw Error(
      data.error || "Unable to complete this request. Please try again.",
    );
  return data;
}
function message(node, error) {
  node.textContent = error.message || "Connection failed. Please try again.";
}

// Native tab panels: a Google form loads only after an explicit request.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden =
      !selected;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
});
$("#go-consent")?.addEventListener("click", () =>
  selectTab($("#consent-tab"), true),
);
document.querySelectorAll(".load-google-form").forEach((button) => {
  button.addEventListener("click", () => {
    const frame = document.getElementById(button.dataset.frame);
    frame.src = frame.dataset.src;
    frame.hidden = false;
    button.hidden = true;
    frame.scrollIntoView({ block: "start", behavior: "auto" });
  });
});

// Feedback is sent to private server storage, never to localStorage or a public feed.
$("#feedback-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget,
    button = form.querySelector("button"),
    status = $("#feedback-status");
  if (!form.reportValidity()) return;
  button.disabled = true;
  status.textContent = "Sending feedback…";
  const values = new FormData(form);
  try {
    await api("feedback", {
      category: values.get("category"),
      message: values.get("message"),
    });
    form.reset();
    status.textContent =
      "Thank you. Your feedback has been saved privately for the academy to review.";
  } catch (error) {
    message(status, error);
  } finally {
    button.disabled = false;
  }
});

// Only confirmed operator-supplied events are displayed; user strings are never HTML.
async function loadEvents() {
  const list = $("#event-list");
  if (!list) return;
  try {
    const events = await api("events");
    if (!Array.isArray(events)) throw Error("Unable to read the events list.");
    list.replaceChildren();
    if (!events.length) {
      const notice = document.createElement("p");
      notice.className = "notice";
      notice.textContent =
        "No upcoming events have been confirmed yet. Opt into updates below or contact the academy for current plans.";
      list.append(notice);
      return;
    }
    events
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .forEach((item) => {
        const card = document.createElement("article");
        card.className = "quick-card";
        const heading = document.createElement("h2");
        heading.textContent = item.title || "Academy event";
        heading.style.fontSize = "26px";
        const date = document.createElement("time");
        date.dateTime = item.date;
        const parsed = new Date(String(item.date) + "T12:00:00+03:00");
        date.textContent = Number.isNaN(parsed.getTime())
          ? "Contact the academy for the date"
          : new Intl.DateTimeFormat("en-KE", {
              dateStyle: "long",
              timeZone: "Africa/Nairobi",
            }).format(parsed);
        const location = document.createElement("p");
        location.textContent = item.location || "Venue to be confirmed";
        const description = document.createElement("p");
        description.textContent =
          item.description || "Contact the academy for details.";
        card.append(heading, date, location, description);
        list.append(card);
      });
  } catch (error) {
    list.replaceChildren();
    const notice = document.createElement("p");
    notice.className = "notice";
    message(notice, error);
    list.append(notice);
  }
}
loadEvents();

// Notifications are optional. Merely visiting never registers a worker or requests permission.
async function setupPush() {
  const enable = $("#push-enable"),
    disable = $("#push-disable"),
    status = $("#push-status");
  if (!enable) return;
  if (
    !isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    !("PushManager" in window)
  ) {
    status.textContent =
      "Push notifications are not supported here. Use HTTPS and a supported browser, or contact the academy for updates.";
    return;
  }
  let key;
  try {
    key = (await api("push/key")).key;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    enable.disabled = false;
    enable.hidden = Boolean(subscription);
    disable.hidden = !subscription;
    status.textContent = subscription
      ? "Notifications are enabled on this device."
      : Notification.permission === "denied"
        ? "Notifications are blocked in your browser settings. You can change that there."
        : "Notifications are off. Enable them only if you want academy updates.";
    if (Notification.permission === "denied") enable.disabled = true;
  } catch (error) {
    message(status, error);
    return;
  }
  enable.addEventListener("click", async () => {
    enable.disabled = true;
    status.textContent = "Waiting for your permission…";
    let created;
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        status.textContent =
          "Notifications were not enabled. You can change permission in your browser settings.";
        return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const padding = "=".repeat((4 - (key.length % 4)) % 4);
        const raw = atob((key + padding).replace(/-/g, "+").replace(/_/g, "/"));
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(raw, (character) =>
            character.charCodeAt(0),
          ),
        });
        created = subscription;
      }
      await api("push/subscribe", subscription.toJSON());
      enable.hidden = true;
      disable.hidden = false;
      status.textContent =
        "Notifications enabled. The academy can now send updates to this device.";
    } catch (error) {
      if (created) {
        try {
          await created.unsubscribe();
        } catch {}
      }
      message(status, error);
    } finally {
      enable.disabled = Notification.permission === "denied";
    }
  });
  disable.addEventListener("click", async () => {
    disable.disabled = true;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      let serverRemoved = true;
      if (subscription) {
        try {
          await api("push/unsubscribe", { endpoint: subscription.endpoint });
        } catch {
          serverRemoved = false;
        }
        if (!(await subscription.unsubscribe()))
          throw Error(
            "Unable to stop notifications. Please use your browser’s notification settings.",
          );
      }
      disable.hidden = true;
      enable.hidden = false;
      status.textContent = serverRemoved
        ? "Notifications disabled on this device."
        : "Notifications stopped on this device. The server could not remove the saved subscription; it will be cleaned up when it expires.";
    } catch (error) {
      message(status, error);
    } finally {
      disable.disabled = false;
    }
  });
}
setupPush();

// Authoritative game rules and sessions live on the Node server. No passwords or tokens are persisted by this script.
async function setupChess() {
  if (!$("#play")) return;
  const serviceStatus = $("#play-service-status"),
    gameStatus = $("#game-status"),
    puzzleStatus = $("#puzzle-status");
  let Chess;
  try {
    ({ Chess } = await import("/vendor/chess.js"));
    await api("me");
    serviceStatus.hidden = true;
  } catch {
    serviceStatus.textContent = serviceError;
    puzzleStatus.textContent = serviceError;
    document
      .querySelectorAll("#play form button, #reset-puzzle")
      .forEach((button) => (button.disabled = true));
    return;
  }
  const glyphs = {
    w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
  };
  const names = {
    k: "king",
    q: "queen",
    r: "rook",
    b: "bishop",
    n: "knight",
    p: "pawn",
  };
  let user = null,
    socket = null,
    mode = null,
    myColor = "w",
    pending = false;
  const gameView = {
    board: $("#game-board"),
    status: gameStatus,
    game: new Chess(),
    selected: null,
    color: "w",
    locked: true,
  };
  const puzzleView = {
    board: $("#puzzle-board"),
    status: puzzleStatus,
    game: null,
    selected: null,
    color: "w",
    locked: false,
  };
  function render(view) {
    if (!view.game) return;
    const focused = view.board.contains(document.activeElement)
      ? document.activeElement.dataset.square
      : null;
    const squares = [];
    const ranks =
      view.color === "b" ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = view.color === "b" ? "hgfedcba" : "abcdefgh";
    const destinations = view.selected
      ? view.game
          .moves({ square: view.selected, verbose: true })
          .map((move) => move.to)
      : [];
    view.board.replaceChildren();
    ranks.forEach((rank, rowIndex) => {
      const row = document.createElement("div");
      row.className = "board-row";
      row.setAttribute("role", "row");
      [...files].forEach((file, columnIndex) => {
        const square = file + rank,
          piece = view.game.get(square),
          button = document.createElement("button");
        button.type = "button";
        button.dataset.square = square;
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-rowindex", String(rowIndex + 1));
        button.setAttribute("aria-colindex", String(columnIndex + 1));
        button.setAttribute(
          "aria-label",
          `${square} ${piece ? (piece.color === "w" ? "White " : "Black ") + names[piece.type] : "empty"}`,
        );
        button.setAttribute("aria-selected", String(view.selected === square));
        button.setAttribute("aria-disabled", String(view.locked));
        button.className =
          "chess-square" +
          ((file.charCodeAt(0) - 97 + rank) % 2 === 1 ? " dark-square" : "") +
          (piece ? " piece-" + (piece.color === "w" ? "white" : "black") : "") +
          (view.selected === square ? " selected-square" : "") +
          (destinations.includes(square) ? " legal-square" : "");
        button.tabIndex =
          square === (focused || view.selected || files[0] + ranks[0]) ? 0 : -1;
        if (piece)
          button.append(
            document.createTextNode(glyphs[piece.color][piece.type]),
          );
        const coordinate = document.createElement("small");
        coordinate.className = "coordinate";
        coordinate.textContent = square;
        coordinate.setAttribute("aria-hidden", "true");
        button.append(coordinate);
        button.addEventListener("click", () => choose(view, square));
        row.append(button);
        squares.push(button);
      });
      view.board.append(row);
    });
    view.board.setAttribute("aria-rowcount", "8");
    view.board.setAttribute("aria-colcount", "8");
    if (focused)
      squares
        .find((button) => button.dataset.square === focused)
        ?.focus({ preventScroll: true });
  }
  [gameView, puzzleView].forEach((view) =>
    view.board.addEventListener("keydown", (event) => {
      const squares = [...view.board.querySelectorAll("button")],
        index = squares.indexOf(document.activeElement);
      const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -8, ArrowDown: 8 }[
        event.key
      ];
      let next =
        delta === undefined
          ? event.key === "Home"
            ? Math.floor(index / 8) * 8
            : event.key === "End"
              ? Math.floor(index / 8) * 8 + 7
              : -1
          : index + delta;
      if (next < 0 || next > 63) return;
      event.preventDefault();
      squares.forEach((button) => (button.tabIndex = -1));
      squares[next].tabIndex = 0;
      squares[next].focus();
    }),
  );
  function updateGame(state) {
    gameView.game = new Chess(state.fen);
    gameView.selected = null;
    gameView.color = myColor;
    gameView.locked =
      pending || state.over || (mode === "online" && state.turn !== myColor);
    gameStatus.textContent = state.status;
    const history = state.history || [];
    $("#move-history").textContent = history.length
      ? history
          .map(
            (move, i) =>
              (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : "") + move,
          )
          .join(" ")
      : "No moves yet.";
    render(gameView);
  }
  async function choose(view, square) {
    if (!view.game || view.locked || pending) return;
    const piece = view.game.get(square);
    if (piece && piece.color === view.game.turn()) {
      view.selected = view.selected === square ? null : square;
      render(view);
      return;
    }
    if (!view.selected) {
      view.status.textContent = "Select a piece of the side to move first.";
      return;
    }
    if (
      !view.game
        .moves({ square: view.selected, verbose: true })
        .some((move) => move.to === square)
    ) {
      view.status.textContent =
        "That move is not legal. Select a highlighted square.";
      return;
    }
    const move = {
      from: view.selected,
      to: square,
      promotion: $("#promotion").value,
    };
    view.selected = null;
    if (view === puzzleView) {
      view.locked = true;
      render(view);
      try {
        const result = await api("puzzle", move);
        if (result.solved) {
          view.game = new Chess(result.fen);
          view.status.textContent = "Correct! Checkmate. Well done.";
          view.locked = true;
        } else {
          view.status.textContent =
            "That move is legal, but not checkmate. Try again.";
          view.locked = false;
        }
      } catch (error) {
        message(view.status, error);
        view.locked = false;
      }
      render(view);
      return;
    }
    if (mode === "computer") {
      pending = true;
      view.locked = true;
      render(view);
      gameStatus.textContent = "Computer is thinking…";
      try {
        const result = await api("computer/move", move);
        pending = false;
        updateGame(result);
      } catch (error) {
        pending = false;
        view.locked = false;
        message(gameStatus, error);
        render(view);
      }
    } else if (mode === "online" && socket?.connected) {
      view.locked = true;
      render(view);
      socket.emit("move", move);
    }
  }
  function endOnline() {
    const closing = socket;
    socket = null;
    if (closing) {
      closing.emit("cancel");
      closing.disconnect();
    }
    $("#leave-online").hidden = true;
    $("#find-opponent").disabled = false;
  }
  function setUser(value) {
    user = value;
    $("#auth-panel").hidden = Boolean(user);
    $("#player-panel").hidden = !user;
    $("#player-greeting").textContent = user ? `Welcome, ${user.name}.` : "";
    if (user) {
      render(gameView);
    }
  }
  for (const [selector, endpoint] of [
    ["#login-form", "login"],
    ["#account-form", "register"],
  ]) {
    $(selector).addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        status = form.querySelector(".auth-status"),
        button = form.querySelector("button");
      if (!form.reportValidity()) return;
      button.disabled = true;
      status.textContent = "Signing in…";
      try {
        const data = await api(
          endpoint,
          Object.fromEntries(new FormData(form)),
        );
        form.reset();
        status.textContent = "";
        setUser(data.user);
      } catch (error) {
        message(status, error);
      } finally {
        button.disabled = false;
      }
    });
  }
  $("#logout").addEventListener("click", async () => {
    if (pending) return;
    try {
      await api("logout", {});
      endOnline();
      mode = null;
      gameView.locked = true;
      gameView.game = new Chess();
      setUser(null);
      gameStatus.textContent = "Choose computer or online play to start.";
      $("#move-history").textContent = "No moves yet.";
    } catch (error) {
      message(gameStatus, error);
    }
  });
  $("#start-computer").addEventListener("click", async () => {
    if (pending) return;
    if (
      socket &&
      !confirm("Leave online matchmaking or your current online game?")
    )
      return;
    endOnline();
    pending = true;
    gameView.locked = true;
    gameStatus.textContent = "Starting computer game…";
    try {
      const state = await api("computer", {});
      mode = "computer";
      myColor = "w";
      pending = false;
      updateGame(state);
    } catch (error) {
      pending = false;
      message(gameStatus, error);
    }
  });
  async function socketLibrary() {
    if (window.io) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/socket.io/socket.io.js";
      script.onload = resolve;
      script.onerror = () => reject(Error(serviceError));
      document.head.append(script);
    });
  }
  $("#find-opponent").addEventListener("click", async () => {
    if (pending || socket) return;
    $("#find-opponent").disabled = true;
    mode = "online";
    gameView.locked = true;
    render(gameView);
    try {
      await socketLibrary();
      const connection = (socket = window.io({
        autoConnect: false,
        reconnection: false,
      }));
      $("#leave-online").hidden = false;
      gameStatus.textContent = "Connecting to online matchmaking…";
      socket.on("connect", () => connection.emit("queue"));
      socket.on(
        "waiting",
        () =>
          (gameStatus.textContent =
            "Waiting for another signed-in player. They must also select Find online opponent."),
      );
      socket.on("matched", (state) => {
        myColor = state.color;
        updateGame(state);
        gameStatus.textContent = `Matched with ${state.opponent}. You play ${myColor === "w" ? "White" : "Black"}. ${state.status}`;
      });
      socket.on("state", updateGame);
      socket.on("moveError", (error) => {
        gameView.locked = gameView.game.turn() !== myColor;
        gameStatus.textContent = String(error);
        render(gameView);
      });
      socket.on("opponentLeft", () => {
        endOnline();
        mode = null;
        gameView.locked = true;
        gameStatus.textContent =
          "Your opponent left. This game has ended. Find another opponent or play the computer.";
        render(gameView);
      });
      socket.on("connect_error", (error) => {
        endOnline();
        gameView.locked = true;
        message(gameStatus, error);
      });
      socket.on("disconnect", () => {
        if (socket === connection) {
          socket = null;
          $("#leave-online").hidden = true;
          $("#find-opponent").disabled = false;
          gameView.locked = true;
          gameStatus.textContent =
            "Disconnected. The online game has ended; please start again.";
          render(gameView);
        }
      });
      socket.connect();
    } catch (error) {
      endOnline();
      message(gameStatus, error);
    }
  });
  $("#leave-online").addEventListener("click", () => {
    endOnline();
    mode = null;
    gameView.locked = true;
    gameStatus.textContent =
      "Online matchmaking/game ended. Choose another game to start.";
    render(gameView);
  });
  async function loadPuzzle() {
    $("#reset-puzzle").disabled = true;
    puzzleView.locked = true;
    try {
      const puzzle = await api("puzzle");
      puzzleView.game = new Chess(puzzle.fen);
      puzzleView.color = puzzleView.game.turn();
      puzzleView.selected = null;
      puzzleView.locked = false;
      $("#puzzle-date").textContent =
        `Challenge date: ${puzzle.date} · Africa/Nairobi`;
      $("#puzzle-hint").textContent = puzzle.hint;
      puzzleStatus.textContent = `${puzzleView.color === "w" ? "White" : "Black"} to move. Find checkmate in one.`;
      render(puzzleView);
    } catch (error) {
      message(puzzleStatus, error);
    } finally {
      $("#reset-puzzle").disabled = false;
    }
  }
  $("#reset-puzzle").addEventListener("click", loadPuzzle);
  try {
    setUser((await api("me")).user);
  } catch (error) {
    message(serviceStatus, error);
    serviceStatus.hidden = false;
  }
  document
    .querySelectorAll("#auth-panel button")
    .forEach((button) => (button.disabled = false));
  await loadPuzzle();
}
setupChess();
