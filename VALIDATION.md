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
