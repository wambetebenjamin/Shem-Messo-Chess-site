/* =============================================================================
   EFFECT-01 · REAL-TIME RENDERED BOARD
   js/hero3d.js — Three.js (r149, vendored at js/vendor/three.min.js)

   Use case: a visitor previews the board — and how a position feels from
   another angle — before they commit to opening the playable board. The
   board orbits by drag and by arrow keys.

   Guarantees
     · poster image (assets/hero-dark-board.jpg) is the fallback AND the
       frame shown until the first WebGL frame lands — never an empty box
     · renders only while the hero is on screen, halts on a hidden tab
     · under prefers-reduced-motion it renders exactly one frame and stops:
       the position is still fully visible, it simply does not move
     · the canvas is role="img" with a text description of the position;
       every orbit action is also available as a real <button>
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-hero3d]");
  if (!root) return;

  var canvas = root.querySelector(".board3d__canvas");
  var poster = root.querySelector(".board3d__poster");
  var note = root.querySelector(".board3d__fallback-note");
  if (!canvas) return;

  var FEN = root.getAttribute("data-fen") ||
    "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 3";
  var LABEL = root.getAttribute("data-label") ||
    "Ruy López opening position after 1.e4 e5 2.Nf3 Nc6 3.Bb5";

  var KC = window.KC;
  var reduced = function () { return KC && KC.motion ? KC.motion.reduced : true; };

  /* ---- bail-outs -------------------------------------------------------- */
  function giveUp(reason) {
    if (note) {
      note.hidden = false;
      note.textContent = reason + " A static diagram of the position is shown instead.";
    }
    canvas.hidden = true;
    if (poster) poster.classList.add("is-fallback");
    root.setAttribute("data-3d", "unavailable");
  }

  if (!window.THREE) { giveUp("The 3D viewer could not load."); return; }

  var gl = null;
  try {
    gl = document.createElement("canvas").getContext("webgl") ||
         document.createElement("canvas").getContext("experimental-webgl");
  } catch (e) { gl = null; }
  if (!gl) { giveUp("This browser does not support WebGL."); return; }

  /* ---- scene ------------------------------------------------------------ */
  var scene = new THREE.Scene();
  scene.background = null;

  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  var orbit = { theta: -0.62, phi: 0.92, radius: 15.5 };
  var target = new THREE.Vector3(0, 0.25, 0);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { giveUp("WebGL could not start on this device."); return; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* ---- lights (no post-processing: cheap enough for a phone) ------------ */
  scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x0a1424, 0.85));
  var key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0016;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x7fd0f7, 0.5);
  rim.position.set(-7, 5, -6);
  scene.add(rim);

  /* ---- board ------------------------------------------------------------ */
  var S = 1;                 /* square size */
  var boardGroup = new THREE.Group();
  scene.add(boardGroup);

  function checkerTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 512;
    var g = c.getContext("2d");
    var light = "#dfe9f2", dark = "#12395c";
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        g.fillStyle = (r + f) % 2 ? dark : light;
        g.fillRect(f * 64, r * 64, 64, 64);
      }
    }
    g.fillStyle = "rgba(10,28,51,.42)";
    g.font = "600 20px system-ui, sans-serif";
    for (var i = 0; i < 8; i++) {
      g.fillText("abcdefgh".charAt(i), i * 64 + 8, 508);
      g.fillText(String(8 - i), 6, i * 64 + 26);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    return tex;
  }

  var topMat = new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.72, metalness: 0.02 });
  var frameMat = new THREE.MeshStandardMaterial({ color: 0x2b1d3f, roughness: 0.55, metalness: 0.15 });

  var playing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.42, 8), [
    frameMat, frameMat, topMat, frameMat, frameMat, frameMat
  ]);
  playing.position.y = -0.21;
  playing.receiveShadow = true;
  boardGroup.add(playing);

  var rail = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.3, 8.9), frameMat);
  rail.position.y = -0.42;
  rail.receiveShadow = true;
  boardGroup.add(rail);

  /* ---- pieces ----------------------------------------------------------- */
  /* Round pieces are lathes of a hand-tuned profile; the knight is an
     extruded silhouette. Both are cheap: the whole board is ~40 draw calls. */
  var matW = new THREE.MeshStandardMaterial({ color: 0xf4ece0, roughness: 0.42, metalness: 0.04 });
  var matB = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.5, metalness: 0.06 });

  function lathe(points, seg) {
    return new THREE.LatheGeometry(points.map(function (p) {
      return new THREE.Vector2(p[0], p[1]);
    }), seg || 28);
  }

  var GEO = {};
  GEO.p = lathe([[0, 0], [0.34, 0], [0.34, 0.07], [0.27, 0.12], [0.17, 0.2], [0.16, 0.5],
                 [0.2, 0.53], [0.12, 0.58], [0.15, 0.72], [0.22, 0.84], [0.19, 0.9],
                 [0.1, 0.96], [0, 1.0]]);
  GEO.r = lathe([[0, 0], [0.36, 0], [0.36, 0.07], [0.29, 0.12], [0.23, 0.28], [0.24, 0.72],
                 [0.31, 0.78], [0.31, 0.94], [0, 0.94]]);
  GEO.b = lathe([[0, 0], [0.35, 0], [0.35, 0.07], [0.28, 0.12], [0.2, 0.26], [0.16, 0.62],
                 [0.2, 0.68], [0.13, 0.74], [0.16, 0.9], [0.1, 1.02], [0.04, 1.16], [0, 1.24]]);
  GEO.q = lathe([[0, 0], [0.38, 0], [0.38, 0.08], [0.31, 0.13], [0.22, 0.3], [0.17, 0.66],
                 [0.24, 0.72], [0.17, 0.78], [0.2, 0.98], [0.28, 1.08], [0.24, 1.16], [0, 1.16]]);
  GEO.k = lathe([[0, 0], [0.39, 0], [0.39, 0.08], [0.32, 0.13], [0.23, 0.3], [0.18, 0.68],
                 [0.25, 0.74], [0.18, 0.8], [0.21, 1.0], [0.28, 1.1], [0.24, 1.18], [0, 1.18]]);

  /* Knight silhouette, extruded. */
  (function () {
    var s = new THREE.Shape();
    s.moveTo(-0.26, 0);
    s.lineTo(0.28, 0);
    s.lineTo(0.2, 0.22);
    s.quadraticCurveTo(0.3, 0.5, 0.2, 0.72);
    s.lineTo(0.06, 0.9);
    s.lineTo(0.02, 1.12);
    s.lineTo(-0.12, 0.95);
    s.quadraticCurveTo(-0.32, 0.82, -0.3, 0.5);
    s.quadraticCurveTo(-0.3, 0.22, -0.26, 0);
    var g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 10 });
    g.center();
    g.translate(0, 0.5, 0);
    GEO.n = g;
  })();

  /* Detail meshes that finish the rook / king / queen crowns. */
  function addCrown(parent, kind, mat) {
    if (kind === "r") {
      for (var i = 0; i < 6; i++) {
        var a = (i / 6) * Math.PI * 2;
        var b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.11), mat);
        b.position.set(Math.cos(a) * 0.22, 0.94, Math.sin(a) * 0.22);
        b.castShadow = true;
        parent.add(b);
      }
    } else if (kind === "k") {
      var v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), mat);
      v.position.y = 1.3; v.castShadow = true; parent.add(v);
      var h = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.08), mat);
      h.position.y = 1.3; h.castShadow = true; parent.add(h);
    } else if (kind === "q") {
      for (var j = 0; j < 7; j++) {
        var t = (j / 7) * Math.PI * 2;
        var d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat);
        d.position.set(Math.cos(t) * 0.2, 1.2, Math.sin(t) * 0.2);
        d.castShadow = true;
        parent.add(d);
      }
    }
  }

  var pieces = new THREE.Group();
  boardGroup.add(pieces);

  function placePiece(kind, color, file, rank) {
    var g = GEO[kind];
    if (!g) return;
    var mat = color === "w" ? matW : matB;
    var mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    addCrown(mesh, kind, mat);
    mesh.position.set((file - 3.5) * S, 0, (3.5 - rank) * S);
    if (kind === "n") mesh.rotation.y = color === "w" ? -Math.PI / 2 : Math.PI / 2;
    pieces.add(mesh);
  }

  function loadFEN(fen) {
    var rows = fen.split(" ")[0].split("/");
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var i = 0; i < rows[r].length; i++) {
        var ch = rows[r].charAt(i);
        if (/\d/.test(ch)) { f += parseInt(ch, 10); continue; }
        var color = ch === ch.toUpperCase() ? "w" : "b";
        placePiece(ch.toLowerCase(), color, f, r);
        f++;
      }
    }
  }
  loadFEN(FEN);

  /* ---- camera control ---------------------------------------------------- */
  var MAX_PHI = 1.42, MIN_PHI = 0.18;
  var dragging = false, lastX = 0, lastY = 0;

  function applyCamera() {
    orbit.phi = Math.max(MIN_PHI, Math.min(MAX_PHI, orbit.phi));
    orbit.radius = Math.max(9, Math.min(24, orbit.radius));
    var sp = Math.sin(orbit.phi), cp = Math.cos(orbit.phi);
    camera.position.set(
      target.x + orbit.radius * sp * Math.sin(orbit.theta),
      target.y + orbit.radius * cp,
      target.z + orbit.radius * sp * Math.cos(orbit.theta)
    );
    camera.lookAt(target);
  }

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    orbit.theta -= (e.clientX - lastX) * 0.007;
    orbit.phi -= (e.clientY - lastY) * 0.005;
    lastX = e.clientX; lastY = e.clientY;
    applyCamera();
    renderOnce();
  });
  function endDrag() { dragging = false; }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", endDrag);

  /* Arrow keys orbit, +/- zoom — the same actions the buttons below perform. */
  canvas.addEventListener("keydown", function (e) {
    var step = 0.12;
    var handled = true;
    switch (e.key) {
      case "ArrowLeft": orbit.theta -= step; break;
      case "ArrowRight": orbit.theta += step; break;
      case "ArrowUp": orbit.phi -= step * 0.6; break;
      case "ArrowDown": orbit.phi += step * 0.6; break;
      case "+": case "=": orbit.radius -= 1; break;
      case "-": case "_": orbit.radius += 1; break;
      case "Home": orbit.theta = -0.62; orbit.phi = 0.92; orbit.radius = 15.5; break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); applyCamera(); renderOnce(); }
  });

  Array.prototype.forEach.call(root.querySelectorAll("[data-orbit]"), function (btn) {
    btn.addEventListener("click", function () {
      var a = btn.getAttribute("data-orbit");
      if (a === "left") orbit.theta -= 0.3;
      else if (a === "right") orbit.theta += 0.3;
      else if (a === "up") orbit.phi -= 0.16;
      else if (a === "down") orbit.phi += 0.16;
      else if (a === "reset") { orbit.theta = -0.62; orbit.phi = 0.92; orbit.radius = 15.5; }
      applyCamera();
      renderOnce();
    });
  });

  /* ---- sizing ------------------------------------------------------------ */
  function resize() {
    var w = canvas.clientWidth || root.clientWidth;
    var h = canvas.clientHeight || Math.round(w);
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyCamera();
    renderOnce();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(root);
  else window.addEventListener("resize", resize);

  /* ---- render ------------------------------------------------------------ */
  var idleSpin = 0.02; /* radians per second */
  function renderOnce() { renderer.render(scene, camera); }

  function frame(dt) {
    if (reduced() || KC.paused) return;
    if (!dragging) orbit.theta += idleSpin * (dt / 1000);
    applyCamera();
    renderOnce();
  }

  applyCamera();
  resize();
  renderOnce();

  /* Poster is only hidden once there is a real frame behind it. */
  root.classList.add("is-live");
  root.setAttribute("data-3d", "live");

  var inView = true;
  if (KC) {
    KC.inView(root, function (on) { inView = on; }, { threshold: 0.05 });
    KC.loop(function (dt) { if (inView) frame(dt); });
    document.addEventListener("kc:motion", function () { if (reduced()) { applyCamera(); renderOnce(); } });
  } else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    (function spin(t) {
      requestAnimationFrame(spin);
      frame(t ? 16 : 16);
    })();
  }
})();
