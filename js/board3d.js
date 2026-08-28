/* ============================================================================
   SMC3D · lightweight 3D chessboard for the academy (three.js)
   Glossy lathe-turned pieces, soft shadows, jade glows under the white army,
   gentle camera sway, click-to-move with legal-target markers and animated
   captures/promotion/castling. Drives both the Play board and the Live room.
   Falls back silently: if WebGL or the CDN is unavailable, callers keep 2D.
   ============================================================================ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const FILES = 'abcdefgh';
const SQ = 1;                       // one board square = 1 unit
const BASE_Y = 0.12;                // top surface of the board squares

/* ---------- piece profiles (radius, height) for the lathe ---------- */
const BASE = [[0.30, 0], [0.305, 0.045], [0.235, 0.095], [0.175, 0.155]];
const STEM = [[0.115, 0.24]];

function lathe(pts, mat) {
  const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(v, 28);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}
function ball(r, y, mat, sx = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
  m.position.y = y; m.scale.x = sx; m.castShadow = true;
  return m;
}
function box(w, h, d, x, y, z, mat, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true;
  return m;
}

function buildPiece(type, color, MAT) {
  const mat = color === 'w' ? MAT.white : MAT.black;
  const g = new THREE.Group();

  if (type === 'p') {
    g.add(lathe([...BASE, ...STEM, [0.095, 0.30], [0.15, 0.335], [0.15, 0.365], [0.10, 0.40], [0.001, 0.40]], mat));
    g.add(ball(0.135, 0.475, mat));
  }
  if (type === 'r') {
    g.add(lathe([...BASE, [0.115, 0.22], [0.105, 0.44], [0.165, 0.475], [0.165, 0.60], [0.135, 0.60], [0.135, 0.66]], mat));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.add(box(0.08, 0.075, 0.08, Math.cos(a) * 0.105, 0.70, Math.sin(a) * 0.105, mat, -a));
    }
  }
  if (type === 'n') {
    g.add(lathe([...BASE, [0.12, 0.20], [0.19, 0.30], [0.175, 0.36], [0.001, 0.36]], mat));
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.095, 0.34, 14), mat);
    neck.position.set(0, 0.47, -0.055); neck.rotation.x = -0.42; neck.castShadow = true;
    g.add(neck);
    const head = box(0.115, 0.185, 0.27, 0, 0.615, 0.02, mat);
    head.rotation.x = -0.30;
    g.add(head);
    g.add(box(0.075, 0.055, 0.15, 0, 0.545, 0.185, mat));           // muzzle
    g.add(box(0.03, 0.09, 0.05, 0.045, 0.735, -0.02, mat));         // ears
    g.add(box(0.03, 0.09, 0.05, -0.045, 0.735, -0.02, mat));
    // mane ridge
    for (let i = 0; i < 4; i++) g.add(box(0.02, 0.028, 0.05, 0, 0.66 - i * 0.075, -0.115 + i * 0.028, mat));
  }
  if (type === 'b') {
    g.add(lathe([...BASE, ...STEM, [0.09, 0.34], [0.14, 0.375], [0.14, 0.405], [0.095, 0.44], [0.001, 0.44]], mat));
    g.add(ball(0.15, 0.545, mat));
    g.add(ball(0.105, 0.635, mat));
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.16, 12), mat);
    spike.position.y = 0.745; spike.castShadow = true;
    g.add(spike);
    g.add(ball(0.033, 0.845, mat));
  }
  if (type === 'q') {
    g.add(lathe([...BASE, ...STEM, [0.105, 0.44], [0.175, 0.505], [0.175, 0.535], [0.125, 0.575], [0.001, 0.575]], mat));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.024, 12, 22), mat);
    ring.position.y = 0.605; ring.rotation.x = Math.PI / 2; ring.castShadow = true;
    g.add(ring);
    // crown points
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const b = ball(0.040, 0, mat);
      b.position.set(Math.cos(a) * 0.115, 0.655, Math.sin(a) * 0.115);
      g.add(b);
    }
    g.add(ball(0.058, 0.70, mat));
  }
  if (type === 'k') {
    g.add(lathe([...BASE, ...STEM, [0.105, 0.47], [0.165, 0.535], [0.165, 0.565], [0.115, 0.60], [0.001, 0.60]], mat));
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 22), mat);
    collar.position.y = 0.635; collar.castShadow = true;
    g.add(collar);
    g.add(box(0.042, 0.15, 0.042, 0, 0.75, 0, mat));
    g.add(box(0.115, 0.042, 0.042, 0, 0.775, 0, mat));
  }
  g.userData.pieceType = type;
  g.userData.pieceColor = color;
  g.traverse(o => { o.castShadow = true; });
  return g;
}

/* ---------- helpers ---------- */
function sqToWorld(sq) {
  const f = FILES.indexOf(sq[0]);
  const r = parseInt(sq[1], 10);
  return { x: (f - 3.5) * SQ, z: (8 - r - 3.5 + 0.5) * SQ - 0.5 * SQ };
}
function captureSquare(move) {
  if (!(move.flags || '').includes('e')) return move.to;
  const r = parseInt(move.to[1], 10) + (move.color === 'w' ? -1 : 1);
  return move.to[0] + r;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(43,245,160,.85)');
  grad.addColorStop(0.45, 'rgba(43,245,160,.28)');
  grad.addColorStop(1, 'rgba(43,245,160,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  return t;
}

/* ---------- main mount ---------- */
function mount(container, opts = {}) {
  const interactive = opts.interactive !== false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const CAM = { x: 0, y: 8.3, z: 8.4 };
  camera.position.set(CAM.x, CAM.y, CAM.z);
  camera.lookAt(0, 0, 0);

  /* lights */
  scene.add(new THREE.HemisphereLight(0xEAFBF3, 0x1E3A30, 0.85));
  const key = new THREE.DirectionalLight(0xFFF6E8, 1.6);
  key.position.set(5, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -6;
  key.shadow.camera.right = key.shadow.camera.top = 6;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.PointLight(0x2BF5A0, 8, 14);
  rim.position.set(-4, 3.5, -5);
  scene.add(rim);

  /* materials */
  const MAT = {
    white: new THREE.MeshPhysicalMaterial({ color: 0xF6F1E2, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.25 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x242C33, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.22 }),
    sqL: new THREE.MeshStandardMaterial({ color: 0xEFE7D2, roughness: 0.55 }),
    sqD: new THREE.MeshStandardMaterial({ color: 0x3F7A5E, roughness: 0.5 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x16222D, roughness: 0.6 }),
  };
  const glowTex = glowTexture();
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.9, depthWrite: false });

  /* board: slab + rim + 64 squares */
  const frame = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.32, 8.9), MAT.frame);
  frame.position.y = -0.165; frame.receiveShadow = true;
  scene.add(frame);

  const squareMeshes = [];
  const sqGroup = new THREE.Group();
  scene.add(sqGroup);
  for (let rr = 0; rr < 8; rr++) {
    for (let ff = 0; ff < 8; ff++) {
      const light = (rr + ff) % 2 === 0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.995, BASE_Y, 0.995), light ? MAT.sqL : MAT.sqD);
      m.position.set((ff - 3.5) * SQ, BASE_Y / 2, (rr - 3.5) * SQ);
      m.receiveShadow = true;
      m.userData.sq = FILES[ff] + (8 - rr);
      sqGroup.add(m); squareMeshes.push(m);
    }
  }

  /* shadow catcher canvas below everything */
  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(9, 40),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  );
  shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = -0.34;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  /* highlight items */
  const markGroup = new THREE.Group(); scene.add(markGroup);
  const dotGeo = new THREE.CircleGeometry(0.17, 24);
  const ringGeo = new THREE.RingGeometry(0.30, 0.37, 26);
  const selGeo = new THREE.PlaneGeometry(0.92, 0.92);
  const lastGeo = new THREE.PlaneGeometry(0.96, 0.96);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x1F8A6D, transparent: true, opacity: 0.75, depthWrite: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xDE6156, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  const selMat = new THREE.MeshBasicMaterial({ color: 0x1F8A6D, transparent: true, opacity: 0.28, depthWrite: false });
  const lastMat = new THREE.MeshBasicMaterial({ color: 0xC9A227, transparent: true, opacity: 0.30, depthWrite: false });
  function flat(geo, mat, sq) {
    const m = new THREE.Mesh(geo, mat);
    const { x, z } = sqToWorld(sq);
    m.position.set(x, BASE_Y + 0.006, z);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    markGroup.add(m);
    return m;
  }

  /* pieces state */
  let pieces = new Map();      // sq -> group
  function placePiece(type, color, sq, pop = false) {
    const g = buildPiece(type, color, MAT);
    const { x, z } = sqToWorld(sq);
    g.position.set(x, BASE_Y, z);
    if (color === 'w') {
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), glowMat);
      gl.rotation.x = -Math.PI / 2; gl.position.y = 0.008; gl.renderOrder = 1;
      g.add(gl);
    }
    if (g.userData.pieceType === 'n' && color === 'b') g.rotation.y = Math.PI;
    g.userData.sq = sq;
    if (pop) { g.scale.setScalar(0.01); tweens.push({ kind: 'pop', obj: g, t0: performance.now(), dur: 340 }); }
    scene.add(g);
    pieces.set(sq, g);
    return g;
  }
  function removePiece(sq, fade = false) {
    const g = pieces.get(sq);
    if (!g) return;
    pieces.delete(sq);
    if (fade) {
      g.traverse(o => { if (o.material && o.material.transparent !== undefined) { o.material = o.material.clone(); o.material.transparent = true; } });
      tweens.push({ kind: 'fade', obj: g, t0: performance.now(), dur: 300, done: () => scene.remove(g) });
    } else scene.remove(g);
  }

  /* tweens */
  const tweens = [];
  function animate() {
    const now = performance.now();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      const p = Math.min(1, (now - t.t0) / t.dur);
      const e = 1 - Math.pow(1 - p, 3);
      if (t.kind === 'move') {
        t.obj.position.lerpVectors(t.from, t.to, e);
        t.obj.position.y = BASE_Y + Math.sin(p * Math.PI) * t.arc;
      } else if (t.kind === 'fade') {
        t.obj.traverse(o => { if (o.material) o.material.opacity = 1 - e; });
        t.obj.position.y = BASE_Y - e * 0.25;
      } else if (t.kind === 'pop') {
        t.obj.scale.setScalar(0.01 + 0.99 * e);
      }
      if (p >= 1) { if (t.kind === 'move') t.obj.position.y = BASE_Y; if (t.done) t.done(); tweens.splice(i, 1); }
    }
  }

  /* pointer: subtle camera sway + click picking */
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let sway = { x: 0, y: 0 };
  container.addEventListener('pointermove', e => {
    const r = container.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    if (!reduceMotion) { sway.x = mouse.x * 0.55; sway.y = mouse.y * 0.3; }
  });
  if (interactive) {
    container.addEventListener('pointerdown', e => {
      const r = container.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      const targets = [...squareMeshes];
      pieces.forEach(g => targets.push(...g.children.flatMap(c => [c])));
      const hits = ray.intersectObjects(sqGroup.children, false);
      if (hits.length && opts.onSquare) opts.onSquare(hits[0].object.userData.sq);
      else {
        // allow tapping directly on a piece
        const pieceHits = ray.intersectObjects([...pieces.values()], true);
        if (pieceHits.length && opts.onSquare) {
          let o = pieceHits[0].object;
          while (o && !o.userData.sq) o = o.parent;
          if (o) opts.onSquare(o.userData.sq);
        }
      }
    });
  }

  /* resize */
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  (function loop() {
    if (!reduceMotion) {
      camera.position.x += (sway.x - camera.position.x - 0) * 0.04;
      camera.position.z += ((CAM.z - sway.y) - camera.position.z) * 0.04;
      camera.lookAt(0, 0, 0);
    }
    animate();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();

  /* ---------- public API ---------- */
  const api = {
    /* instant rebuild from a chess.js board() 2D array (row 0 = rank 8) */
    sync(board) {
      [...pieces.keys()].forEach(sq => removePiece(sq));
      for (let rr = 0; rr < 8; rr++) for (let ff = 0; ff < 8; ff++) {
        const c = board[rr][ff];
        if (c) placePiece(c.type, c.color, FILES[ff] + (8 - rr));
      }
      markGroup.clear();
    },
    /* animate one move (verbose chess.js move) */
    playMove(move) {
      markGroup.clear();
      const from = move.from, to = move.to;
      const piece = pieces.get(from);
      // capture first
      if (move.captured) removePiece(captureSquare(move), true);
      if (!piece) return;
      pieces.delete(from);
      piece.userData.sq = to;
      pieces.set(to, piece);
      const { x: x2, z: z2 } = sqToWorld(to);
      tweens.push({ kind: 'move', obj: piece, from: piece.position.clone(), to: new THREE.Vector3(x2, BASE_Y, z2), arc: 0.55, t0: performance.now(), dur: 460 });
      // promotion: swap the pawn for the chosen piece
      if (move.promotion) {
        setTimeout(() => { removePiece(to); placePiece(move.promotion, move.color, to, true); }, 470);
      }
      // castling: the rook travels too
      if ((move.flags || '').includes('k') || (move.flags || '').includes('q')) {
        const kingSide = (move.flags || '').includes('k');
        const rank = move.color === 'w' ? '1' : '8';
        const rFrom = (kingSide ? 'h' : 'a') + rank;
        const rTo = (kingSide ? 'f' : 'd') + rank;
        const rook = pieces.get(rFrom);
        if (rook) {
          pieces.delete(rFrom); rook.userData.sq = rTo; pieces.set(rTo, rook);
          const rp = sqToWorld(rTo);
          tweens.push({ kind: 'move', obj: rook, from: rook.position.clone(), to: new THREE.Vector3(rp.x, BASE_Y, rp.z), arc: 0.4, t0: performance.now(), dur: 420 });
        }
      }
      // last-move gold wash
      flat(lastGeo, lastMat, from); flat(lastGeo, lastMat, to);
    },
    setSelection(selected, targets, getPiece) {
      [...markGroup.children].forEach(c => { if (c.material === selMat || c.material === dotMat || c.material === ringMat) markGroup.remove(c); });
      if (selected) flat(selGeo, selMat, selected);
      (targets || []).forEach(sq => {
        if (getPiece && getPiece(sq)) flat(ringGeo, ringMat, sq);
        else flat(dotGeo, dotMat, sq);
      });
    }
  };
  return api;
}

window.SMC3D = { mount };
document.dispatchEvent(new Event('smc3d:ready'));
