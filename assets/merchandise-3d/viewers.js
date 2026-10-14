import * as THREE from "./three.min.js";

const motion = matchMedia("(prefers-reduced-motion: reduce)");
const viewers = [];
let frame = null,
  previousTime = null;
const textureURL = new URL("academy-print.png", import.meta.url).href;
const inkPromise = new THREE.TextureLoader().loadAsync(textureURL);
// A failed image never replaces the reference photograph with unbranded clothing.
inkPromise.catch(() => {});
const bulge = (x, y) =>
  Math.abs(x) < 0.7
    ? 0.1 * (1 - (x / 0.7) ** 2) * (0.85 + 0.15 * Math.cos(y * 2))
    : 0.012;
function fabric(color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#888";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 4) {
    ctx.fillStyle = "#aaa";
    ctx.fillRect(i, 0, 1, 64);
    ctx.fillStyle = "#666";
    ctx.fillRect(0, i, 64, 1);
  }
  const bump = new THREE.CanvasTexture(canvas);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(6, 6);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0,
    bumpMap: bump,
    bumpScale: 0.006,
  });
}
function volume(shape, material, depth = 0.46, bevel = 0.075, curved = true) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 24,
    steps: 1,
  });
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i) - depth / 2;
    positions.setZ(i, z + (curved ? Math.sign(z) * bulge(x, y) : 0));
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function tube(points, radius, material) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      48,
      radius,
      8,
      false,
    ),
    material,
  );
  mesh.castShadow = true;
  return mesh;
}
function garment(kind, source) {
  const group = new THREE.Group();
  const color =
    kind === "polo" ? 0x202226 : kind === "hoodie" ? 0xe9e2d4 : 0xf7f7f3;
  const material = fabric(color),
    trim = fabric(
      kind === "polo" ? 0x16181c : kind === "hoodie" ? 0xd9d0bf : 0xe6e6df,
    );
  const shape = new THREE.Shape();
  shape.moveTo(-0.62, -1.3);
  shape.lineTo(0.62, -1.3);
  shape.lineTo(0.69, 0.32);
  if (kind === "hoodie") {
    shape.lineTo(0.94, -1.25);
    shape.lineTo(1.25, -1.2);
    shape.lineTo(1.25, 0.62);
    shape.lineTo(0.88, 1.1);
  } else {
    shape.lineTo(0.96, 0.18);
    shape.lineTo(1.35, 0.64);
    shape.lineTo(0.88, 1.1);
  }
  shape.lineTo(0.33, 1.23);
  shape.quadraticCurveTo(0.24, 1.03, 0, 1.04);
  shape.quadraticCurveTo(-0.24, 1.03, -0.33, 1.23);
  shape.lineTo(-0.88, 1.1);
  if (kind === "hoodie") {
    shape.lineTo(-1.25, 0.62);
    shape.lineTo(-1.25, -1.2);
    shape.lineTo(-0.94, -1.25);
    shape.lineTo(-0.69, 0.32);
  } else {
    shape.lineTo(-1.35, 0.64);
    shape.lineTo(-0.96, 0.18);
    shape.lineTo(-0.69, 0.32);
  }
  shape.closePath();
  group.add(volume(shape, material));
  // Curved printed surface: artwork is taken directly from the user's photograph.
  const printCanvas = document.createElement("canvas");
  printCanvas.width = source.image.width;
  printCanvas.height = source.image.height;
  const ctx = printCanvas.getContext("2d");
  ctx.drawImage(source.image, 0, 0);
  if (kind === "polo") {
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);
  }
  const print = new THREE.CanvasTexture(printCanvas);
  print.colorSpace = THREE.SRGBColorSpace;
  const width = kind === "hoodie" ? 0.99 : 1.1,
    center = kind === "polo" ? 0.03 : 0.13;
  const plane = new THREE.PlaneGeometry(
    width,
    (width * printCanvas.height) / printCanvas.width,
    24,
    24,
  );
  const p = plane.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i) + center;
    p.setXYZ(i, x, y, 0.46 / 2 + 0.075 + bulge(x, y) + 0.014);
  }
  plane.computeVertexNormals();
  group.add(
    new THREE.Mesh(
      plane,
      new THREE.MeshStandardMaterial({
        map: print,
        transparent: true,
        depthWrite: false,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    ),
  );
  // Garment construction details, not additional unconfirmed branding.
  if (kind === "tshirt") {
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          0.3 * Math.cos(t),
          1.22 - 0.15 * Math.sin(t),
          0.32 * Math.sin(t),
        ),
      );
    }
    group.add(tube(points, 0.035, trim));
  }
  if (kind === "polo") {
    for (const side of [-1, 1]) {
      const collar = new THREE.Shape();
      collar.moveTo(side * 0.03, 1.13);
      collar.lineTo(side * 0.36, 1.26);
      collar.lineTo(side * 0.47, 0.95);
      collar.lineTo(side * 0.18, 0.77);
      collar.closePath();
      const flap = volume(collar, trim, 0.04, 0.015, false);
      flap.position.z = 0.4;
      group.add(flap);
    }
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.42, 0.035),
      trim,
    );
    placket.position.set(0, 0.9, 0.39);
    group.add(placket);
    for (const y of [1.0, 0.82]) {
      const button = new THREE.Mesh(
        new THREE.SphereGeometry(0.027, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0x4a4b4c, roughness: 0.8 }),
      );
      button.position.set(0, y, 0.423);
      group.add(button);
    }
  }
  if (kind === "hoodie") {
    const hood = new THREE.Shape();
    hood.moveTo(-0.35, 1.06);
    hood.bezierCurveTo(-0.6, 1.51, -0.48, 1.92, 0, 1.94);
    hood.bezierCurveTo(0.48, 1.92, 0.6, 1.51, 0.35, 1.06);
    hood.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, 1.5, 0.27, 0.31, 0, Math.PI * 2, true);
    hood.holes.push(hole);
    const rim = volume(hood, material, 0.42, 0.06, false);
    rim.position.z = -0.04;
    group.add(rim);
    const lining = new THREE.Mesh(new THREE.SphereGeometry(0.39, 32, 24), trim);
    lining.scale.set(1, 1.15, 0.5);
    lining.position.set(0, 1.51, -0.26);
    group.add(lining);
    for (const x of [-0.19, 0.19]) {
      group.add(
        tube(
          [
            new THREE.Vector3(x, 1.1, 0.36),
            new THREE.Vector3(x * 0.9, 0.89, 0.44),
            new THREE.Vector3(x * 1.12, 0.7, 0.41),
          ],
          0.012,
          trim,
        ),
      );
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0xaca697 }),
      );
      tip.position.set(x * 1.12, 0.67, 0.41);
      group.add(tip);
    }
    const pocket = new THREE.Shape();
    pocket.moveTo(-0.47, -1.05);
    pocket.lineTo(0.47, -1.05);
    pocket.lineTo(0.53, -0.69);
    pocket.lineTo(0.31, -0.45);
    pocket.lineTo(-0.31, -0.45);
    pocket.lineTo(-0.53, -0.69);
    pocket.closePath();
    const pouch = volume(pocket, material, 0.035, 0.02, true);
    pouch.position.z = 0.34;
    group.add(pouch);
    const hem = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.57), trim);
    hem.position.set(0, -1.27, 0);
    group.add(hem);
    for (const x of [-1.09, 1.09]) {
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.5), trim);
      cuff.position.set(x, -1.22, 0);
      group.add(cuff);
    }
  }
  group.rotation.y = 0.1;
  group.position.y = kind === "hoodie" ? -0.2 : 0;
  return group;
}
function dispose(view) {
  view.scene.traverse((object) => {
    object.geometry?.dispose();
    const materials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : [];
    materials.forEach((material) => {
      material.map?.dispose();
      material.bumpMap?.dispose();
      material.dispose();
    });
  });
  view.renderer.dispose();
}
function fallback(root, text) {
  root.dataset.ready = "fallback";
  root.querySelector(".garment-fallback").hidden = false;
  root.querySelector(".garment-controls").hidden = true;
  root.querySelector("canvas")?.remove();
  root.querySelector(".garment-status").textContent = text;
}
function controls(view) {
  const pause = view.root.querySelector('[data-rotation="pause"]');
  pause.disabled = motion.matches;
  pause.textContent = view.paused || motion.matches ? "▶" : "Ⅱ";
  pause.setAttribute(
    "aria-label",
    motion.matches
      ? `Automatic ${view.label} rotation disabled for reduced motion`
      : `${view.paused ? "Resume" : "Pause"} ${view.label} rotation`,
  );
  pause.setAttribute("aria-pressed", String(view.paused));
}
function wake() {
  if (frame === null) {
    previousTime = null;
    frame = requestAnimationFrame(tick);
  }
}
function tick(time) {
  frame = null;
  const delta =
    previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  let active = false;
  for (const view of viewers) {
    if (view.failed || !view.visible || document.hidden) continue;
    const rotating = !view.paused && !motion.matches && !view.dragging;
    if (rotating) {
      view.model.rotation.y =
        (view.model.rotation.y + (delta * Math.PI * 2) / 16) % (Math.PI * 2);
      view.dirty = true;
      active = true;
    }
    if (view.dirty) {
      view.renderer.render(view.scene, view.camera);
      view.root.dataset.angle = view.model.rotation.y.toFixed(3);
      view.dirty = false;
    }
  }
  if (active) frame = requestAnimationFrame(tick);
}
async function init(root) {
  let renderer, scene;
  try {
    const source = await inkPromise;
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const stage = root.querySelector(".garment-stage");
    const canvas = renderer.domElement;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", root.dataset.description);
    stage.append(canvas);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa8b3c4, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3.5);
    light.position.set(-3, 5, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.left = -3;
    light.shadow.camera.right = 3;
    light.shadow.camera.top = 3;
    light.shadow.camera.bottom = -3;
    light.shadow.normalBias = 0.025;
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xdce6ff, 1.7);
    rim.position.set(3, 2, -3);
    scene.add(rim);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.ShadowMaterial({ opacity: 0.13 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.59;
    ground.receiveShadow = true;
    scene.add(ground);
    const model = garment(root.dataset.garment, source);
    scene.add(model);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
    camera.position.set(0, 0.3, 6.2);
    camera.lookAt(0, 0.1, 0);
    const view = {
      root,
      renderer,
      scene,
      camera,
      model,
      label: root.dataset.label,
      visible: true,
      paused: false,
      dragging: false,
      dirty: true,
      failed: false,
    };
    const resize = () => {
      if (view.failed) return;
      const width = stage.clientWidth,
        height = stage.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      view.dirty = true;
      wake();
    };
    new ResizeObserver(resize).observe(stage);
    resize();
    root.querySelector(".garment-fallback").hidden = true;
    root.querySelector(".garment-controls").hidden = false;
    root.dataset.ready = "true";
    root.querySelector(".garment-status").textContent =
      "Drag to turn · 360° illustration";
    root.querySelectorAll("[data-rotation]").forEach((button) =>
      button.addEventListener("click", () => {
        const action = button.dataset.rotation;
        if (action === "pause") {
          view.paused = !view.paused;
        } else {
          view.paused = true;
          model.rotation.y =
            action === "front"
              ? 0
              : model.rotation.y +
                (action === "left" ? -Math.PI / 4 : Math.PI / 4);
        }
        controls(view);
        view.dirty = true;
        wake();
      }),
    );
    let lastX = 0,
      startX = 0,
      startY = 0,
      moved = false;
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      view.dragging = true;
      moved = false;
      startX = lastX = event.clientX;
      startY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!view.dragging) return;
      if (!moved) {
        const horizontal = Math.abs(event.clientX - startX);
        if (horizontal < 6 || horizontal < Math.abs(event.clientY - startY))
          return;
        moved = true;
        view.paused = true;
        controls(view);
      }
      model.rotation.y += (event.clientX - lastX) * 0.012;
      lastX = event.clientX;
      view.dirty = true;
      wake();
    });
    const release = () => {
      view.dragging = false;
      wake();
    };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      view.failed = true;
      dispose(view);
      fallback(
        root,
        "3D view unavailable. Showing the supplied clothing reference.",
      );
    });
    new IntersectionObserver(
      (entries) => {
        view.visible = entries[0].isIntersecting;
        if (view.visible) {
          view.dirty = true;
          wake();
        }
      },
      { threshold: 0.05 },
    ).observe(root);
    viewers.push(view);
    controls(view);
    wake();
  } catch {
    if (renderer) {
      if (scene) dispose({ scene, renderer });
      else renderer.dispose();
    }
    fallback(
      root,
      "3D view is unavailable here. Showing the supplied clothing reference.",
    );
  }
}
for (const root of document.querySelectorAll("[data-garment]")) init(root);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) wake();
});
motion.addEventListener("change", () => {
  viewers.forEach((view) => {
    controls(view);
    view.dirty = true;
  });
  wake();
});
