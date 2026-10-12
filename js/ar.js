/* =============================================================================
   EFFECT-03 · AR / 360° TOURNAMENT OVERLAY
   js/ar.js

   Use case: tournament immersion — a spectator places a full-size board in
   the room in front of them, or spins the 360° preview when AR is not there.

   Rules this module follows
     · AR is strictly opt-in: nothing is requested until the visitor presses
       the button, and the button stays disabled until support is confirmed
     · the 360° preview is the default and works everywhere
     · the exit control is a real <button>, always in the DOM, always
       focusable, and it ends the XR session (it never auto-dismisses)
   ========================================================================== */
(function () {
  "use strict";

  var wrap = document.querySelector("[data-ar]");
  if (!wrap) return;

  var KC = window.KC;
  var reduced = function () { return KC ? KC.motion.reduced : true; };

  var stage = wrap.querySelector("[data-ar-stage]");
  var plate = wrap.querySelector("[data-ar-plate]");
  var btn = wrap.querySelector("[data-ar-start]");
  var exit = wrap.querySelector("[data-ar-exit]");
  var supportEl = wrap.querySelector("[data-ar-support]");
  var hintEl = wrap.querySelector(".spin-stage__hint");

  /* ---------------------------------------------------------------------
     360° PREVIEW — the fallback that is also the default
     --------------------------------------------------------------------- */
  var ry = -18, rx = -14;

  function buildPlate() {
    if (!plate || plate.dataset.built) return;
    var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
    var grid = document.createElement("div");
    grid.className = "spin-plate__grid";
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var sq = document.createElement("span");
        sq.className = "spin-plate__sq" + ((r + f) % 2 ? " is-dark" : "");
        grid.appendChild(sq);
      }
    }
    plate.appendChild(grid);

    /* A recognisable endgame: white king, white rook, lone black king. */
    var pieces = [
      { src: "assets/pieces/wk.png", f: 4, r: 6, alt: "" },
      { src: "assets/pieces/wr.png", f: 0, r: 5, alt: "" },
      { src: "assets/pieces/bk.png", f: 7, r: 0, alt: "" },
      { src: "assets/pieces/wp.png", f: 1, r: 3, alt: "" },
      { src: "assets/pieces/bp.png", f: 6, r: 2, alt: "" }
    ];
    pieces.forEach(function (p) {
      var img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt;
      img.width = 64; img.height = 64;
      img.className = "spin-plate__piece";
      img.style.left = (p.f * 12.5) + "%";
      img.style.top = (p.r * 12.5) + "%";
      img.style.width = "12.5%";
      plate.appendChild(img);
    });
    plate.dataset.built = "1";
  }

  function paint() {
    if (!plate) return;
    plate.style.setProperty("--ry", ry.toFixed(1) + "deg");
    plate.style.setProperty("--rx", rx.toFixed(1) + "deg");
    if (wrap.querySelector("[data-ar-deg]")) {
      var deg = ((ry % 360) + 360) % 360;
      wrap.querySelector("[data-ar-deg]").textContent = Math.round(deg) + "°";
    }
  }

  var dragging = false, lastX = 0, lastY = 0;
  if (stage) {
    stage.addEventListener("pointerdown", function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      ry += (e.clientX - lastX) * 0.6;
      rx = Math.max(-62, Math.min(24, rx - (e.clientY - lastY) * 0.4));
      lastX = e.clientX; lastY = e.clientY;
      paint();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
      stage.addEventListener(evt, function () { dragging = false; });
    });
    stage.addEventListener("keydown", function (e) {
      var handled = true;
      switch (e.key) {
        case "ArrowLeft": ry -= 12; break;
        case "ArrowRight": ry += 12; break;
        case "ArrowUp": rx = Math.max(-62, rx - 8); break;
        case "ArrowDown": rx = Math.min(24, rx + 8); break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); paint(); }
    });
  }

  /* ---------------------------------------------------------------------
     WEBXR — opt-in only
     --------------------------------------------------------------------- */
  var xrSession = null;
  var xrRenderer = null;

  function supportText(state, msg) {
    if (supportEl) {
      supportEl.setAttribute("data-state", state);
      supportEl.textContent = msg;
    }
  }

  function probeXR() {
    if (!navigator.xr || !navigator.xr.isSessionSupported) {
      supportText("none", "AR needs a WebXR-capable browser. Drag the preview instead — it works here.");
      if (btn) { btn.disabled = true; btn.setAttribute("aria-disabled", "true"); }
      return;
    }
    navigator.xr.isSessionSupported("immersive-ar").then(function (ok) {
      if (ok) {
        supportText("yes", "This device can place the board in your room.");
        if (btn) { btn.disabled = false; btn.removeAttribute("aria-disabled"); }
      } else {
        supportText("no", "This device has no AR session. Drag the preview to inspect the position from any angle.");
        if (btn) { btn.disabled = true; btn.setAttribute("aria-disabled", "true"); }
      }
    }).catch(function () {
      supportText("no", "AR is unavailable here. Drag the preview instead.");
      if (btn) { btn.disabled = true; btn.setAttribute("aria-disabled", "true"); }
    });
  }

  function buildXRModel(THREE) {
    var group = new THREE.Group();

    var c = document.createElement("canvas");
    c.width = c.height = 256;
    var g = c.getContext("2d");
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        g.fillStyle = (r + f) % 2 ? "#12395c" : "#dfe9f2";
        g.fillRect(f * 32, r * 32, 32, 32);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    var board = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2b1d3f })
    );
    var top = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.48),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.011;
    board.add(top);
    group.add(board);

    var matW = new THREE.MeshStandardMaterial({ color: 0xf4ece0, roughness: 0.45 });
    var matB = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.5 });
    var set = [
      { f: 4, r: 6, w: true }, { f: 0, r: 5, w: true }, { f: 1, r: 3, w: true },
      { f: 7, r: 0, w: false }, { f: 6, r: 2, w: false }
    ];
    set.forEach(function (p) {
      var h = 0.055;
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, h, 20), p.w ? matW : matB);
      mesh.position.set((p.f - 3.5) * 0.06, h / 2 + 0.01, (p.r - 3.5) * 0.06);
      group.add(mesh);
    });

    /* The board sits at floor level, 1.1m in front of the viewer. */
    group.position.set(0, -0.35, -1.1);
    return group;
  }

  function startAR() {
    if (!window.THREE) { supportText("no", "The 3D library did not load, so AR is unavailable. Drag the preview instead."); return; }
    navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local-floor"],
      optionalFeatures: ["hit-test", "dom-overlay"],
      domOverlay: document.body
    }).then(function (session) {
      xrSession = session;

      if (!xrRenderer) {
        xrRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        xrRenderer.setPixelRatio(window.devicePixelRatio || 1);
        xrRenderer.xr.enabled = true;
      }
      var scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x20242c, 1.1));
      var dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(0.6, 1.4, 0.8);
      scene.add(dir);
      scene.add(buildXRModel(THREE));

      xrRenderer.xr.setReferenceSpaceType("local-floor");
      xrRenderer.xr.setSession(session).then(function () {
        var camera = new THREE.PerspectiveCamera();
        xrRenderer.setAnimationLoop(function () { xrRenderer.render(scene, camera); });
      });

      stage.setAttribute("data-mode", "ar");
      if (exit) { exit.hidden = false; exit.focus({ preventScroll: true }); }
      if (hintEl) hintEl.textContent = "AR session running. Use Exit AR view to come back to the page.";
      if (KC) KC.announce("AR session started. The board is placed in front of you. Use the Exit AR view button to return.");

      session.addEventListener("end", endAR);
    }).catch(function (err) {
      supportText("no", "The AR session could not start (" + (err && err.name ? err.name : "denied") + "). Drag the preview instead.");
    });
  }

  function endAR() {
    if (xrSession) {
      try { xrSession.end(); } catch (e) {}
      xrSession = null;
    }
    if (xrRenderer) { xrRenderer.setAnimationLoop(null); }
    stage.removeAttribute("data-mode");
    if (hintEl) hintEl.textContent = "Drag to spin · arrow keys rotate · the button places it in your room.";
    if (btn) btn.focus({ preventScroll: true });
    if (KC) KC.announce("AR session ended. Back on the page.");
  }

  if (btn) btn.addEventListener("click", startAR);
  if (exit) exit.addEventListener("click", endAR);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && xrSession) endAR();
  });

  buildPlate();
  paint();
  probeXR();
})();
