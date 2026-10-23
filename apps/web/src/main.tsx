import { Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { Arena, Character, Effects } from "./Scene";
import { Engine } from "./Engine";
import { controls, useGame, match, start, touch } from "./runtime";
import "./style.css";
function TouchControls() {
  const origin = useRef({ x: 0, y: 0 }),
    aim = useRef({ x: 0, y: 0 });
  return (
    <div className="touch-controls">
      <div
        className="aim-zone"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          aim.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          controls.yaw -= (e.clientX - aim.current.x) * 0.006;
          controls.pitch = THREE.MathUtils.clamp(
            controls.pitch - (e.clientY - aim.current.y) * 0.005,
            -0.65,
            0.65,
          );
          aim.current = { x: e.clientX, y: e.clientY };
        }}
      />
      <div
        className="joystick"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          origin.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            controls.mx = THREE.MathUtils.clamp(
              (e.clientX - origin.current.x) / 45,
              -1,
              1,
            );
            controls.mz = THREE.MathUtils.clamp(
              -(e.clientY - origin.current.y) / 45,
              -1,
              1,
            );
          }
        }}
        onPointerUp={() => {
          controls.mx = controls.mz = 0;
        }}
        onPointerCancel={() => {
          controls.mx = controls.mz = 0;
        }}
      >
        <span>MOVE</span>
      </div>
      <button
        className="fire touch-button"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          controls.fire = true;
        }}
        onPointerUp={() => (controls.fire = false)}
        onPointerCancel={() => (controls.fire = false)}
      >
        FIRE
      </button>
      <button
        className="jump touch-button"
        onPointerDown={() => (controls.jump = true)}
      >
        JUMP
      </button>
      <button
        className="reload touch-button"
        onPointerDown={() => (controls.reload = true)}
      >
        ↻
      </button>
      <button
        className="sprint touch-button"
        onPointerDown={() => (controls.sprint = true)}
        onPointerUp={() => (controls.sprint = false)}
        onPointerCancel={() => (controls.sprint = false)}
      >
        RUN
      </button>
    </div>
  );
}
function HUD() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const id = setInterval(() => refresh((x) => x + 1), 70);
    return () => clearInterval(id);
  }, []);
  const p = match.players[0],
    b = match.players[1];
  return (
    <>
      <div className="top-hud">
        <div className="player-panel">
          <small>YOU · BLUE TEAM</small>
          <strong>
            {p.hp}
            <span> HP</span>
          </strong>
          <div className="health">
            <i style={{ width: `${p.hp}%` }} />
          </div>
        </div>
        <div className="scoreboard">
          <div>
            <b>{p.score}</b>
            <span>FIRST TO 5</span>
            <b className="coral">{b.score}</b>
          </div>
          <small>
            {match.sudden ? "SUDDEN DEATH " : ""}
            {Math.floor(Math.max(0, match.time) / 60)}:
            {String(Math.floor(Math.max(0, match.time) % 60)).padStart(2, "0")}
          </small>
        </div>
        <button
          className="pause-button"
          onClick={() => {
            useGame.getState().set({ paused: true });
            document.exitPointerLock();
          }}
        >
          II
        </button>
        <div className="player-panel opponent">
          <small>BOT · CORAL TEAM</small>
          <strong>
            {b.hp}
            <span> HP</span>
          </strong>
          <div className="health">
            <i style={{ width: `${b.hp}%` }} />
          </div>
        </div>
      </div>
      <div className="crosshair">+</div>
      {p.dead > 0 && (
        <div className="respawn">
          <h2>SPLASHED!</h2>Back in {Math.ceil(p.dead)} seconds
        </div>
      )}
      {p.protection > 0 && p.dead <= 0 && (
        <div className="protected">SPAWN SHIELD · SHOOT TO BREAK</div>
      )}
      <div className="bottom-hud">
        <div>
          <small>SPLASH BLASTER</small>
          <strong>{p.reload > 0 ? "RELOADING" : `${p.ammo} / 12`}</strong>
          <span>
            {p.reload > 0
              ? `${Math.max(0, p.reload).toFixed(1)}s`
              : "R to reload"}
          </span>
        </div>
        <p>
          WASD move <em>·</em> SPACE double jump <em>·</em> SHIFT sprint{" "}
          <em>·</em> CLICK splash
        </p>
        <div className="arena-label">
          ◈ SPLASH YARD<small>PRACTICE / LOCAL</small>
        </div>
      </div>
      <TouchControls />
    </>
  );
}
function App() {
  const state = useGame();
  const [settings, setSettings] = useState(false);
  const p = match.players[0];
  return (
    <main className={state.screen === "menu" ? "on-menu" : ""}>
      <Canvas
        shadows={state.quality}
        dpr={[1, state.quality ? 1.7 : 1]}
        camera={{ position: [21, 20, 25], fov: 58 }}
      >
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} gravity={[0, -22, 0]}>
            <Arena />
            {state.screen === "menu" ? (
              <group position={[9, 1, 1]} scale={2.5}>
                <Float speed={2} floatIntensity={0.25}>
                  <Character index={0} display />
                </Float>
              </group>
            ) : (
              <>
                <Character index={0} />
                <Character index={1} />
                <Effects />
              </>
            )}
          </Physics>
          <Engine />
        </Suspense>
      </Canvas>
      <div className="vignette" />
      {state.screen === "menu" && (
        <>
          <header>
            <span className="brand-icon">◉</span>
            <b>
              WBW<span> / PLAYGROUND SERIES</span>
            </b>
            <span className="build-label">PHASE 01 · LOCAL PRACTICE</span>
          </header>
          <section className="menu">
            <div className="eyebrow">
              <i /> SMALL BALLOONS. BIG RIVALRIES.
            </div>
            <h1>
              WATER
              <br />
              BALLOON
              <br />
              <span>WAR.</span>
            </h1>
            <p>
              Your backyard. Your battleground.
              <br />
              Grab a blaster and make a splash.
            </p>
            <div className="menu-actions">
              <button className="primary" onClick={start}>
                LET’S SPLASH <span>&gt;</span>
              </button>
              <button className="secondary" onClick={() => setSettings(true)}>
                SET
              </button>
            </div>
            <div className="mode-note">
              <span>01</span>
              <div>
                <b>PRACTICE VS. BOT</b>
                <small>No login. No waiting. Just water.</small>
              </div>
            </div>
            <label className="difficulty">
              BOT DIFFICULTY{" "}
              <select
                value={state.difficulty}
                onChange={(e) =>
                  state.set({ difficulty: Number(e.target.value) })
                }
              >
                <option value={0}>Easy</option>
                <option value={1}>Regular</option>
                <option value={2}>Splash expert</option>
              </select>
            </label>
          </section>
          <div className="arena-card">
            <span>THE FIRST ARENA</span>
            <b>Splash Yard</b>
            <small>1V1 · FIRST TO FIVE · ALL FUN</small>
          </div>
          <footer>
            <span>BUILT FOR A FRIENDLY RIVALRY.</span>
            <span>DESKTOP + MOBILE &gt;</span>
          </footer>
        </>
      )}
      {state.screen === "game" && <HUD />}
      {state.screen === "game" && state.paused && (
        <div className="overlay">
          <section className="modal">
            <small>TAKE A BREATHER</small>
            <h2>Splash paused.</h2>
            <p>The practice match is paused.</p>
            <button
              className="primary"
              onClick={() => {
                state.set({ paused: false });
                if (!touch())
                  void document.querySelector("canvas")?.requestPointerLock();
              }}
            >
              BACK TO THE YARD &gt;
            </button>
            <button className="text-button" onClick={() => setSettings(true)}>
              Settings
            </button>
            <button
              className="text-button"
              onClick={() => state.set({ screen: "menu", paused: false })}
            >
              Return to menu
            </button>
          </section>
        </div>
      )}
      {state.screen === "result" && (
        <div className="overlay">
          <section className="modal result">
            <small>MATCH COMPLETE · SPLASH YARD</small>
            <h2>
              {match.winner === null
                ? "A perfect tie."
                : match.winner === 0
                  ? "You made waves!"
                  : "All splashed out."}
            </h2>
            <div className="final-score">
              {p.score}
              <span>:</span>
              {match.players[1].score}
            </div>
            <p>
              {match.winner === null
                ? "Draw"
                : match.winner === 0
                  ? "VICTORY"
                  : "DEFEAT"}{" "}
              · {match.sudden ? "Sudden death" : "Practice match"}
            </p>
            <div className="stats">
              <div>
                <b>{p.damage}</b>
                <small>DAMAGE</small>
              </div>
              <div>
                <b>{p.shots ? Math.round((p.hits / p.shots) * 100) : 0}%</b>
                <small>ACCURACY</small>
              </div>
              <div>
                <b>{p.score}</b>
                <small>ELIMINATIONS</small>
              </div>
            </div>
            <button className="primary" onClick={start}>
              ONE MORE ROUND &gt;
            </button>
            <button
              className="text-button"
              onClick={() => state.set({ screen: "menu" })}
            >
              Return to menu
            </button>
          </section>
        </div>
      )}
      {settings && (
        <div className="overlay settings">
          <section className="modal">
            <small>MAKE IT YOURS</small>
            <h2>Settings</h2>
            <label>
              Camera sensitivity{" "}
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.1"
                value={state.sensitivity}
                onChange={(e) =>
                  state.set({ sensitivity: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Sound effects{" "}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.volume}
                onChange={(e) => state.set({ volume: Number(e.target.value) })}
              />
            </label>
            <label>
              High quality{" "}
              <input
                type="checkbox"
                checked={state.quality}
                onChange={(e) => state.set({ quality: e.target.checked })}
              />
            </label>
            <button className="primary" onClick={() => setSettings(false)}>
              DONE ✓
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
// Read-only diagnostics for local browser testing; never sent over a network.
if (import.meta.env.DEV)
  Object.defineProperty(window, "__WBW__", {
    configurable: true,
    get: () => ({
      players: match.players.map((p) => ({ ...p, pos: { ...p.pos }, vel: { ...p.vel } })),
      time: match.time,
      ended: match.ended,
      winner: match.winner,
      yaw: controls.yaw,
      pitch: controls.pitch,
      screen: useGame.getState().screen,
      paused: useGame.getState().paused,
    }),
  });
createRoot(document.getElementById("root")!).render(<App />);
