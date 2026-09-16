/* ============================================================================
   HERO 3D CINEMATIC CHESS ENGINE (three.js + chess.js)
   Renders an uplifting, cinematic 3D moving chessboard in the background.
   Plays through immortal, inspiring classical master games with silky physical
   piece arcs, capturing dissolves, theme-reactive lighting, and floating motes.
   ============================================================================ */

import * as THREE from './vendor/three.module.js';

(function () {
  'use strict';

  // Check WebGL availability
  function hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  if (!hasWebGL() || typeof Chess === 'undefined') {
    return;
  }

  const canvas = document.getElementById('hero3dCanvas');
  const stage = document.getElementById('hero3dStage');
  if (!canvas || !stage) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Uplifting Masterpieces ---------- */
  const MASTERPIECES = [
    {
      id: 'opera',
      title: 'The Opera Game',
      players: 'Morphy vs Duke of Brunswick (1858)',
      moves: [
        'e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5',
        'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5',
        'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7',
        'Qb8+', 'Nxb8', 'Rd8#'
      ]
    },
    {
      id: 'immortal',
      title: 'The Immortal Game',
      players: 'Anderssen vs Kieseritzky (1851)',
      moves: [
        'e4', 'e5', 'f4', 'exf4', 'Bc4', 'Qh4+', 'Kf1', 'b5', 'Bxb5', 'Nf6',
        'Nf3', 'Qh6', 'd3', 'Nh5', 'Nh4', 'Qg5', 'Nf5', 'c6', 'g4', 'Nf6',
        'Rg1', 'cxb5', 'h4', 'Qg6', 'h5', 'Qg5', 'Qf3', 'Ng8', 'Bxf4', 'Qf6',
        'Nc3', 'Bc5', 'Nd5', 'Qxb2', 'Bd6', 'Bxg1', 'e5', 'Qxa1+', 'Ke2', 'Na6',
        'Nxg7+', 'Kd8', 'Qf6+', 'Nxf6', 'Be7#'
      ]
    },
    {
      id: 'evergreen',
      title: 'The Evergreen Game',
      players: 'Anderssen vs Dufresne (1852)',
      moves: [
        'e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5',
        'd4', 'exd4', 'O-O', 'd3', 'Qb3', 'Qf6', 'e5', 'Qg6', 'Re1', 'Nge7',
        'Ba3', 'b5', 'Qxb5', 'Rb8', 'Qa4', 'Bb6', 'Nbd2', 'Bb7', 'Ne4', 'Qf5',
        'Bxd3', 'Qh5', 'Nf6+', 'gxf6', 'exf6', 'Rg8', 'Rad1', 'Qxf3', 'Rxe7+', 'Nxe7',
        'Qxd7+', 'Kxd7', 'Bf5+', 'Ke8', 'Bd7+', 'Kf8', 'Bxe7#'
      ]
    }
  ];

  /* ---------- Constants & Setup ---------- */
  const FILES = 'abcdefgh';
  const SQ = 1;
  const BASE_Y = 0.12;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  /* Camera Angle Presets */
  const CAM_PRESETS = [
    { name: 'Cinematic 3/4', x: -3.8, y: 7.2, z: 9.6, lookX: -0.4, lookY: 0, lookZ: -0.4 },
    { name: 'Broadcast Top', x: -0.2, y: 11.2, z: 7.4, lookX: 0, lookY: 0, lookZ: 0 },
    { name: 'Dramatic Hero', x: -4.6, y: 4.8, z: 7.8, lookX: 0.2, lookY: 0.4, lookZ: -0.2 }
  ];
  let camPresetIndex = 0;
  let targetCam = { ...CAM_PRESETS[0] };
  camera.position.set(targetCam.x, targetCam.y, targetCam.z);
  camera.lookAt(targetCam.lookX, targetCam.lookY, targetCam.lookZ);

  /* ---------- Lighting System ---------- */
  const hemiLight = new THREE.HemisphereLight(0xF4FAF6, 0x1A3528, 0.95);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xFFF6E5, 1.9);
  sunLight.position.set(6, 12, 5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -6;
  sunLight.shadow.camera.right = 6;
  sunLight.shadow.camera.top = 6;
  sunLight.shadow.camera.bottom = -6;
  sunLight.shadow.radius = 4;
  scene.add(sunLight);

  const rimLight = new THREE.PointLight(0x2AA886, 7, 18);
  rimLight.position.set(-6, 4, -4);
  scene.add(rimLight);

  const warmAccent = new THREE.PointLight(0xF59E0B, 4, 16);
  warmAccent.position.set(4, 3, -6);
  scene.add(warmAccent);

  /* ---------- Theme Theme Colors & Materials ---------- */
  const THEME_STYLES = {
    sunrise: {
      hemiSky: 0xF6FBF8, hemiGround: 0x1E3A2F,
      sunColor: 0xFFF2D8, sunInt: 1.9,
      rimColor: 0x2AA886, rimInt: 7,
      warmColor: 0xC99518, warmInt: 4,
      whitePiece: { color: 0xF8F4EB, roughness: 0.28, clearcoat: 0.65 },
      blackPiece: { color: 0x22322A, roughness: 0.32, clearcoat: 0.55 },
      sqL: 0xF0EAD8, sqD: 0x2E6B52, frame: 0x1B2C24,
      particleColor: 0xFCD34D
    },
    midnight: {
      hemiSky: 0x0E2B23, hemiGround: 0x05130E,
      sunColor: 0xE0FFF2, sunInt: 2.2,
      rimColor: 0x34D399, rimInt: 10,
      warmColor: 0xF59E0B, warmInt: 5.5,
      whitePiece: { color: 0xE8FDF3, roughness: 0.22, clearcoat: 0.8 },
      blackPiece: { color: 0x121F1A, roughness: 0.25, clearcoat: 0.7 },
      sqL: 0xBED4C9, sqD: 0x0E382A, frame: 0x071612,
      particleColor: 0x34D399
    },
    highland: {
      hemiSky: 0xFDF7EE, hemiGround: 0x24170E,
      sunColor: 0xFEE8C8, sunInt: 2.0,
      rimColor: 0x10B981, rimInt: 6.5,
      warmColor: 0xB45309, warmInt: 5,
      whitePiece: { color: 0xF9F1E2, roughness: 0.3, clearcoat: 0.6 },
      blackPiece: { color: 0x2C1D13, roughness: 0.34, clearcoat: 0.55 },
      sqL: 0xEDE0C9, sqD: 0x2A5844, frame: 0x271910,
      particleColor: 0xF59E0B
    }
  };

  const MAT = {
    white: new THREE.MeshPhysicalMaterial({ color: 0xF8F4EB, roughness: 0.28, clearcoat: 0.65 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x22322A, roughness: 0.32, clearcoat: 0.55 }),
    sqL: new THREE.MeshStandardMaterial({ color: 0xF0EAD8, roughness: 0.52 }),
    sqD: new THREE.MeshStandardMaterial({ color: 0x2E6B52, roughness: 0.48 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x1B2C24, roughness: 0.55 }),
  };

  function applyActiveTheme(themeId) {
    const t = THEME_STYLES[themeId] || THEME_STYLES.sunrise;
    hemiLight.color.setHex(t.hemiSky);
    hemiLight.groundColor.setHex(t.hemiGround);

    sunLight.color.setHex(t.sunColor);
    sunLight.intensity = t.sunInt;

    rimLight.color.setHex(t.rimColor);
    rimLight.intensity = t.rimInt;

    warmAccent.color.setHex(t.warmColor);
    warmAccent.intensity = t.warmInt;

    MAT.white.color.setHex(t.whitePiece.color);
    MAT.white.roughness = t.whitePiece.roughness;
    MAT.white.clearcoat = t.whitePiece.clearcoat;

    MAT.black.color.setHex(t.blackPiece.color);
    MAT.black.roughness = t.blackPiece.roughness;
    MAT.black.clearcoat = t.blackPiece.clearcoat;

    MAT.sqL.color.setHex(t.sqL);
    MAT.sqD.color.setHex(t.sqD);
    MAT.frame.color.setHex(t.frame);

    if (particlesMat) {
      particlesMat.color.setHex(t.particleColor);
    }
  }

  /* ---------- Board Geometry ---------- */
  const boardGroup = new THREE.Group();
  scene.add(boardGroup);

  const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(8.95, 0.32, 8.95), MAT.frame);
  frameMesh.position.y = -0.165;
  frameMesh.receiveShadow = true;
  boardGroup.add(frameMesh);

  // Decorative frame bevel trim
  const frameTrim = new THREE.Mesh(
    new THREE.BoxGeometry(9.12, 0.04, 9.12),
    new THREE.MeshStandardMaterial({ color: 0xC99518, metalness: 0.4, roughness: 0.4 })
  );
  frameTrim.position.y = -0.12;
  boardGroup.add(frameTrim);

  const squareMeshes = [];
  for (let rr = 0; rr < 8; rr++) {
    for (let ff = 0; ff < 8; ff++) {
      const isLight = (rr + ff) % 2 === 0;
      const sqMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.995, BASE_Y, 0.995),
        isLight ? MAT.sqL : MAT.sqD
      );
      sqMesh.position.set((ff - 3.5) * SQ, BASE_Y / 2, (rr - 3.5) * SQ);
      sqMesh.receiveShadow = true;
      sqMesh.userData.sq = FILES[ff] + (8 - rr);
      boardGroup.add(sqMesh);
      squareMeshes.push(sqMesh);
    }
  }

  // Soft shadow ground plane
  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 48),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.34;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  /* ---------- Uplifting Floating Light Motes ---------- */
  const PARTICLE_COUNT = reduceMotion ? 0 : 75;
  let particlesMat = null;
  if (PARTICLE_COUNT > 0) {
    const partGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const speed = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 6 + 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      speed[i] = Math.random() * 0.008 + 0.004;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    particlesMat = new THREE.PointsMaterial({
      color: 0xFCD34D,
      size: 0.16,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(partGeo, particlesMat);
    particleSystem.userData.speed = speed;
    scene.add(particleSystem);
  }

  /* ---------- Lathe-Turned 3D Pieces ---------- */
  const BASE = [[0.30, 0], [0.305, 0.045], [0.235, 0.095], [0.175, 0.155]];
  const STEM = [[0.115, 0.24]];

  function lathe(pts, mat) {
    const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(v, 24);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function ball(r, y, mat, sx = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);
    m.position.y = y; m.scale.x = sx;
    m.castShadow = true;
    return m;
  }
  function box(w, h, d, x, y, z, mat, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = true;
    return m;
  }

  function buildPiece(type, color) {
    const mat = color === 'w' ? MAT.white : MAT.black;
    const g = new THREE.Group();

    if (type === 'p') {
      g.add(lathe([...BASE, ...STEM, [0.095, 0.30], [0.15, 0.335], [0.15, 0.365], [0.10, 0.40], [0.001, 0.40]], mat));
      g.add(ball(0.135, 0.475, mat));
    } else if (type === 'r') {
      g.add(lathe([...BASE, [0.115, 0.22], [0.105, 0.44], [0.165, 0.475], [0.165, 0.60], [0.135, 0.60], [0.135, 0.66]], mat));
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        g.add(box(0.08, 0.075, 0.08, Math.cos(a) * 0.105, 0.70, Math.sin(a) * 0.105, mat, -a));
      }
    } else if (type === 'n') {
      g.add(lathe([...BASE, [0.12, 0.20], [0.19, 0.30], [0.175, 0.36], [0.001, 0.36]], mat));
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.095, 0.34, 14), mat);
      neck.position.set(0, 0.47, -0.055); neck.rotation.x = -0.42; neck.castShadow = true;
      g.add(neck);
      const head = box(0.115, 0.185, 0.27, 0, 0.615, 0.02, mat);
      head.rotation.x = -0.30;
      g.add(head);
      g.add(box(0.075, 0.055, 0.15, 0, 0.545, 0.185, mat));
      g.add(box(0.03, 0.09, 0.05, 0.045, 0.735, -0.02, mat));
      g.add(box(0.03, 0.09, 0.05, -0.045, 0.735, -0.02, mat));
    } else if (type === 'b') {
      g.add(lathe([...BASE, ...STEM, [0.09, 0.34], [0.14, 0.375], [0.14, 0.405], [0.095, 0.44], [0.001, 0.44]], mat));
      g.add(ball(0.15, 0.545, mat));
      g.add(ball(0.105, 0.635, mat));
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.16, 12), mat);
      spike.position.y = 0.745; spike.castShadow = true;
      g.add(spike);
      g.add(ball(0.033, 0.845, mat));
    } else if (type === 'q') {
      g.add(lathe([...BASE, ...STEM, [0.105, 0.44], [0.175, 0.505], [0.175, 0.535], [0.125, 0.575], [0.001, 0.575]], mat));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.024, 12, 22), mat);
      ring.position.y = 0.605; ring.rotation.x = Math.PI / 2; ring.castShadow = true;
      g.add(ring);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const b = ball(0.040, 0, mat);
        b.position.set(Math.cos(a) * 0.115, 0.655, Math.sin(a) * 0.115);
        g.add(b);
      }
      g.add(ball(0.058, 0.70, mat));
    } else if (type === 'k') {
      g.add(lathe([...BASE, ...STEM, [0.105, 0.47], [0.165, 0.535], [0.165, 0.565], [0.115, 0.60], [0.001, 0.60]], mat));
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 20), mat);
      collar.position.y = 0.635; collar.castShadow = true;
      g.add(collar);
      g.add(box(0.042, 0.15, 0.042, 0, 0.75, 0, mat));
      g.add(box(0.115, 0.042, 0.042, 0, 0.775, 0, mat));
    }

    g.userData.pieceType = type;
    g.userData.pieceColor = color;
    g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }

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

  /* ---------- Pieces Management & Tweens ---------- */
  const pieces = new Map();
  const tweens = [];

  function placePiece(type, color, sq) {
    const g = buildPiece(type, color);
    const { x, z } = sqToWorld(sq);
    g.position.set(x, BASE_Y, z);
    if (g.userData.pieceType === 'n' && color === 'b') {
      g.rotation.y = Math.PI;
    }
    g.userData.sq = sq;
    scene.add(g);
    pieces.set(sq, g);
    return g;
  }

  function removePiece(sq, fade = false) {
    const g = pieces.get(sq);
    if (!g) return;
    pieces.delete(sq);
    if (fade && !reduceMotion) {
      g.traverse(o => {
        if (o.material) {
          o.material = o.material.clone();
          o.material.transparent = true;
        }
      });
      tweens.push({
        kind: 'fade',
        obj: g,
        t0: performance.now(),
        dur: 400,
        done: () => scene.remove(g)
      });
    } else {
      scene.remove(g);
    }
  }

  function syncBoard(boardState) {
    [...pieces.keys()].forEach(sq => removePiece(sq, false));
    for (let rr = 0; rr < 8; rr++) {
      for (let ff = 0; ff < 8; ff++) {
        const c = boardState[rr][ff];
        if (c) {
          placePiece(c.type, c.color, FILES[ff] + (8 - rr));
        }
      }
    }
  }

  function animateMove(move) {
    const from = move.from;
    const to = move.to;
    const piece = pieces.get(from);

    // If capture, remove captured piece with graceful elevate & fade
    if (move.captured) {
      removePiece(captureSquare(move), true);
    }

    if (!piece) return;

    pieces.delete(from);
    piece.userData.sq = to;
    pieces.set(to, piece);

    const { x: x2, z: z2 } = sqToWorld(to);
    const isKnight = piece.userData.pieceType === 'n';

    if (reduceMotion) {
      piece.position.set(x2, BASE_Y, z2);
    } else {
      tweens.push({
        kind: 'move',
        obj: piece,
        from: piece.position.clone(),
        to: new THREE.Vector3(x2, BASE_Y, z2),
        arc: isKnight ? 0.8 : 0.45,
        t0: performance.now(),
        dur: 520
      });
    }

    // Pawn Promotion
    if (move.promotion) {
      setTimeout(() => {
        removePiece(to, false);
        placePiece(move.promotion, move.color, to);
      }, reduceMotion ? 10 : 540);
    }

    // Castling: move rook in tandem
    if ((move.flags || '').includes('k') || (move.flags || '').includes('q')) {
      const kingSide = (move.flags || '').includes('k');
      const rank = move.color === 'w' ? '1' : '8';
      const rFrom = (kingSide ? 'h' : 'a') + rank;
      const rTo = (kingSide ? 'f' : 'd') + rank;
      const rook = pieces.get(rFrom);
      if (rook) {
        pieces.delete(rFrom);
        rook.userData.sq = rTo;
        pieces.set(rTo, rook);
        const rp = sqToWorld(rTo);
        if (reduceMotion) {
          rook.position.set(rp.x, BASE_Y, rp.z);
        } else {
          tweens.push({
            kind: 'move',
            obj: rook,
            from: rook.position.clone(),
            to: new THREE.Vector3(rp.x, BASE_Y, rp.z),
            arc: 0.35,
            t0: performance.now() + 60,
            dur: 480
          });
        }
      }
    }
  }

  /* ---------- Game Loop Replayer ---------- */
  let activeGameIdx = 0;
  let game = new Chess();
  let moveIdx = 0;
  let isPlaying = true;
  let moveTimer = null;
  const MOVE_INTERVAL = 2600; // ms between moves

  const gameTitleEl = document.getElementById('hero3dGameTitle');
  const moveNotationEl = document.getElementById('hero3dMoveNotation');
  const playBtn = document.getElementById('hero3dPlayBtn');
  const camBtn = document.getElementById('hero3dCamBtn');
  const nextBtn = document.getElementById('hero3dNextBtn');

  function updateHUD(san, fullMoveNum, isWhite) {
    const cur = MASTERPIECES[activeGameIdx];
    if (gameTitleEl) {
      gameTitleEl.textContent = cur.title;
    }
    if (moveNotationEl) {
      if (!san) {
        moveNotationEl.textContent = 'Opening Position';
      } else {
        const sideDot = isWhite ? 'w' : '…';
        moveNotationEl.textContent = `${fullMoveNum}.${sideDot} ${san}`;
      }
    }
  }

  function startMatch(idx) {
    if (moveTimer) clearTimeout(moveTimer);
    tweens.length = 0;
    activeGameIdx = (idx + MASTERPIECES.length) % MASTERPIECES.length;
    game = new Chess();
    moveIdx = 0;
    syncBoard(game.board());
    updateHUD(null, 1, true);

    if (isPlaying) {
      moveTimer = setTimeout(stepMove, 1600);
    }
  }

  function stepMove() {
    if (!isPlaying) return;
    const cur = MASTERPIECES[activeGameIdx];

    if (moveIdx >= cur.moves.length) {
      // Game ended in checkmate/brilliance!
      if (moveNotationEl) {
        moveNotationEl.innerHTML = '<span style="color:var(--brass); font-weight:800;">Checkmate! ★</span>';
      }
      moveTimer = setTimeout(() => {
        startMatch(activeGameIdx + 1);
      }, 4200);
      return;
    }

    const san = cur.moves[moveIdx];
    const isWhite = (moveIdx % 2 === 0);
    const fullMoveNum = Math.floor(moveIdx / 2) + 1;
    const move = game.move(san);

    if (move) {
      animateMove(move);
      updateHUD(san, fullMoveNum, isWhite);
      moveIdx++;
      moveTimer = setTimeout(stepMove, MOVE_INTERVAL);
    } else {
      // In case of syntax anomaly, advance
      startMatch(activeGameIdx + 1);
    }
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (playBtn) {
      playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
      playBtn.setAttribute('title', isPlaying ? 'Pause 3D Match' : 'Resume 3D Match');
    }
    if (isPlaying) {
      stepMove();
    } else if (moveTimer) {
      clearTimeout(moveTimer);
    }
  }

  function cycleCamera() {
    camPresetIndex = (camPresetIndex + 1) % CAM_PRESETS.length;
    targetCam = { ...CAM_PRESETS[camPresetIndex] };
    if (camBtn) {
      camBtn.classList.add('cam-pulse');
      setTimeout(() => camBtn.classList.remove('cam-pulse'), 400);
    }
  }

  function nextGame() {
    startMatch(activeGameIdx + 1);
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (camBtn) camBtn.addEventListener('click', cycleCamera);
  if (nextBtn) nextBtn.addEventListener('click', nextGame);

  /* ---------- Resize Handling ---------- */
  function onResize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w === 0 || h === 0) return;

    camera.aspect = w / h;
    if (w < 900) {
      CAM_PRESETS[0].x = 0;
      CAM_PRESETS[0].y = 9.8;
      CAM_PRESETS[0].z = 11.5;
      CAM_PRESETS[0].lookX = 0;
      CAM_PRESETS[0].lookZ = 0;
    } else {
      CAM_PRESETS[0].x = -3.8;
      CAM_PRESETS[0].y = 7.2;
      CAM_PRESETS[0].z = 9.6;
      CAM_PRESETS[0].lookX = -0.4;
      CAM_PRESETS[0].lookZ = -0.4;
    }
    targetCam = { ...CAM_PRESETS[camPresetIndex] };
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', onResize, { passive: true });

  /* ---------- IntersectionObserver for Battery Preservation ---------- */
  let isVisible = true;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isVisible = entry.isIntersecting;
    });
  }, { threshold: 0.05 });
  observer.observe(stage);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) isVisible = false;
    else if (stage.getBoundingClientRect().bottom > 0) isVisible = true;
  });

  /* ---------- Theme Sync ---------- */
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'sunrise';
  applyActiveTheme(currentTheme);

  const themeObserver = new MutationObserver(() => {
    const updated = document.documentElement.getAttribute('data-theme') || 'sunrise';
    applyActiveTheme(updated);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('theme:change', (e) => {
    if (e.detail && e.detail.theme) applyActiveTheme(e.detail.theme);
  });

  /* ---------- Render Loop with Gentle Cinematic Drift ---------- */
  let lastTime = performance.now();

  function render(now) {
    requestAnimationFrame(render);

    if (!isVisible) return;

    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Process piece animations
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      const p = Math.min(1, (now - t.t0) / t.dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      if (t.kind === 'move') {
        t.obj.position.lerpVectors(t.from, t.to, e);
        t.obj.position.y = BASE_Y + Math.sin(p * Math.PI) * t.arc;
        if (p >= 1) tweens.splice(i, 1);
      } else if (t.kind === 'fade') {
        t.obj.traverse(o => {
          if (o.material && o.material.opacity !== undefined) {
            o.material.opacity = 1 - e;
          }
        });
        t.obj.position.y = BASE_Y + e * 0.35;
        if (p >= 1) {
          if (t.done) t.done();
          tweens.splice(i, 1);
        }
      }
    }

    // Floating particles drift
    if (particlesMat && PARTICLE_COUNT > 0) {
      const pos = particlesMat.geometry.attributes.position.array;
      const speeds = particlesMat.geometry.userData ? particlesMat.geometry.userData.speed : null;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3 + 1] += speeds ? speeds[i] : 0.006;
        if (pos[i * 3 + 1] > 6.5) {
          pos[i * 3 + 1] = 0.2;
        }
      }
      particlesMat.geometry.attributes.position.needsUpdate = true;
    }

    // Smooth camera transition toward target preset
    camera.position.x += (targetCam.x - camera.position.x) * 0.05;
    camera.position.y += (targetCam.y - camera.position.y) * 0.05;
    camera.position.z += (targetCam.z - camera.position.z) * 0.05;

    // Gentle cinematic organic sway (breathing camera)
    if (!reduceMotion && camPresetIndex === 0) {
      const swayX = Math.sin(now * 0.00035) * 0.45;
      const swayZ = Math.cos(now * 0.00028) * 0.35;
      camera.position.x += swayX * 0.03;
      camera.position.z += swayZ * 0.03;
    }

    camera.lookAt(targetCam.lookX, targetCam.lookY, targetCam.lookZ);

    renderer.render(scene, camera);
  }

  // Initial sizing and kick off match
  onResize();
  startMatch(0);
  requestAnimationFrame(render);

})();
