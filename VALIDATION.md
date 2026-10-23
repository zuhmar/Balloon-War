# Phase 1 validation — 2026-10-23

Validated in the cloud environment using Node 24.19.0 and npm 11.9.0.

- A fresh `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` succeeded using the committed lockfile.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 11 tests passed, zero failures/skips.
- `npm run build`: passed. Vite reports a large bundle (~3.4 MB / 1.16 MB gzip); download size and real-device frame-rate profiling remain optimization work.
- Headless Chromium with software WebGL, desktop layout: arena/characters rendered, movement changed world position, two jumps registered, shots consumed ammo, enemy hits reduced health, pause froze the timer, and resume restarted the simulation. An automated player aimed and strafed through real browser input to win a **5–0** match (500 damage, 20 hits, 54 shots). The results screen rendered correctly. No uncaught browser errors occurred.
- Production preview: HTTP 200, match timer advanced, no development diagnostics API, no uncaught browser errors, and zero external asset requests.
- Chromium mobile emulation at 844×390: touch joystick moved the character, a second simultaneous touch fired while moving, and successive jump-button taps registered a double jump. No uncaught browser errors occurred.

Browser screenshots from this onboarding session are in `/workspace/artifacts` (outside the repository). These checks do not establish 60 FPS on physical mobile hardware, Safari/iOS compatibility, online multiplayer, or production hosting. No multiplayer server, database, accounts, ranked play, or real-device tests were run.

The initial browser check exposed an external font fallback request that blocked the scene. All in-world labels now use locally generated canvas textures. No TLS or artifact-verification checks were disabled.

## Detailed character update — 2026-10-23

- Lint, TypeScript, 18 tests (11 existing gameplay + 7 character tests), and production build passed.
- Character tests cover animation event detection/blending, pause, menu recovery after elimination, frame-rate-independent smoothing, real projectile-to-muzzle alignment across yaw/pitch/recoil poses, and a bounded geometry/draw budget.
- Chromium desktop regression completed a **5–1** match with the new rigs: 500 damage, 20 hits, 75 shots. Movement, double jump, shooting, pause/resume, damage, elimination/respawn, scoring, and results worked without uncaught browser errors.
- Mobile emulation again passed joystick movement, simultaneous movement/firing, and double jump with the new character.
- No gameplay rule values, collision bounds, camera controls, or mobile controls changed. The simulation now retains aim pitch for presentation and uses the same numeric muzzle offsets through a shared socket helper.
- Static geometry is merged by material per animated part; animation mutates transforms without React rerenders. Each rendered rig measures 60 meshes and 31,374 triangles (including shield); tests enforce fewer than 70 meshes and 35,000 triangles. Simulation updates now precede rig sampling, and live browser checks confirmed both moving AI and player muzzle sockets match their shared projectile origins within floating-point tolerance. Physical mobile GPU performance remains unbenchmarked, and the pre-existing large-bundle warning remains.
