# Clothing illustrations

The three reference crops and transparent chest artwork derive from the user-supplied `WhatsApp Image 2026-10-14 at 12.04.54 PM.jpeg` on the repository's `main` branch. Colors/print placement follow the supplied front-view designs: white round-neck T-shirt, cream pullover hoodie, black polo with reversed white ink. No new back artwork, pricing, availability or sizing is invented.

`viewers.js` constructs actual volumetric WebGL garment illustrations: beveled curved bodies, sleeve silhouettes, crew collar, polo collar/placket/buttons, hoodie hood/lining/drawstrings/pocket/cuffs, textured fabric, curved artwork and lighting/shadows. These are illustrative procedural models, not scanned garments or manufacturing specifications. Backs are illustrative because no back reference was supplied. The card explicitly labels this boundary.

Each turns around its vertical axis every 16 seconds, with individual pause/front/left/right and horizontal pointer-drag controls. Dragging/manual positioning pauses autoplay. Autoplay suspends offscreen, in hidden tabs and with reduced motion; manual controls remain available. Context loss, texture or WebGL failure leaves a static reference fallback and enquiries usable. All assets run locally, including on static hosting; no Node APIs or CDN are required for 3D.

`three.min.js` bundles **Three.js 0.186.1** under the adjacent MIT license. Generated with:

```sh
npx esbuild node_modules/three/build/three.module.js --bundle --minify --format=esm --outfile=assets/merchandise-3d/three.min.js --legal-comments=linked
```

The runtime is vendored so normal `npm ci` does not need to retain the temporary Three.js/esbuild asset-build dependencies. The linked legal notice is retained. No telemetry, user data or external fonts/textures are loaded.
