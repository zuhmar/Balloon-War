# Water Balloon War

A browser-based, third-person water balloon duel. **Phase 1 is a local practice game against a bot.** No account, database, backend, API keys, paid assets, or deployed service is needed.

## Run

Requires Node.js 22+ and npm 10+.

```sh
npm ci
npm run dev
```

Open the Vite address printed in your terminal. For a phone on the same trusted network, open the computer's LAN address on port 5173. The dev server binds to all interfaces; don't expose it publicly as a production service.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -w @wbw/web -- --host 0.0.0.0
```

If your cloud machine has a read-only home directory, use `npm ci --cache /workspace/.npm-cache`.

## Play

Choose bot difficulty and press **LET'S SPLASH**. Click the canvas to capture your mouse. WASD moves relative to the camera; mouse aims; left click fires; Space jumps (again in midair for a double jump); Shift sprints; R reloads; Escape pauses and releases the pointer. Resume captures the pointer again. Touch devices have a movement pad, right-side drag aiming, and simultaneous fire/jump/run/reload controls. Landscape orientation is recommended on phones. Settings provide rendering quality, camera sensitivity, and effect volume.

Players have 100 HP, balloons deal 25 damage, and the blaster fires twice per second with 12 rounds and a 1.5-second reload. Eliminated players return after three seconds with two seconds of protection; firing ends protection. First to five eliminations wins. The five-minute timer awards the lead, or starts 60 seconds of sudden death on a tie; a further tie is a draw. Pausing freezes local practice.

## Structure

- `apps/web`: React, TypeScript, Vite, Three.js/R3F, Drei, Rapier world colliders, Zustand UI state, Tailwind/CSS.
- `packages/shared`: arena layout, types, weapon and match constants.
- `packages/game`: rendering-independent 60 Hz practice simulation and tests.
- `apps/server`: workspace reserved for the later authoritative server; **no multiplayer implementation exists yet**.

Procedural geometry, locally generated label textures, particles, and synthesized Web Audio avoid external asset requests. Movement uses a swept-axis character controller with platform landings; projectiles use three collision substeps per simulation tick. Rapier currently supplies static arena colliders; the local deterministic gameplay controller handles player and projectile collision rules. Future online authority should reuse/test these rules rather than accept client hits. Character parts are hierarchical; running and recoil are procedural. A development-only read-only `window.__WBW__` snapshot supports browser diagnostics. It is omitted from production builds.

## Validation

The Vitest suite exercises double-jump limits, boundaries, platform landings, shot cooldowns, magazine/reload behavior, damage, protection, eliminations, respawns, first-to-five, time expiry, sudden death, draw handling, and cover impacts. Browser smoke checks exercise rendering, desktop movement/jumping/shooting, pause/resume, and mobile touch controls. See `VALIDATION.md` for actual outcomes.

## Deployment

The practice frontend is static and deploys independently. In Vercel, use repository root as the project root, `npm run build` as the build command, and `apps/web/dist` as the output directory. The root `vercel.json` records these settings. No server URL is required for Phase 1.

## Next phases / limitations

Phase 2: full animation blending and elimination/victory animations, improved navigating/cover-seeking AI, pooled effects and projectiles, power-ups, cosmetics, separate music/effects controls, performance overlay, adjustable touch layout, ramps and expanded arena routes. The current bot pursues, strafes, aims, fires, and jumps at obstacles; it has no navmesh or tactical cover planner. Hardware performance targets are not yet benchmarked; a large Three.js/Rapier bundle remains to optimize. Touch input is browser-tested with emulation, not physical devices.

Phase 3: Node/Express/Socket.IO authoritative simulation, private rooms, casual queues, prediction/reconciliation/interpolation, reconnect/disconnect rules, network validation and integration tests.

Phase 4: established secure authentication, PostgreSQL/Prisma migrations, persistent profiles, ranked Elo, duplicate-result prevention, leaderboards and history.

Phase 5: abuse protection, rate limiting, observability, load testing, Render backend deployment and managed database documentation. No online/ranked UI is presented as working today. Never put secrets in a `VITE_` variable or commit credentials.
