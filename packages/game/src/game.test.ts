import { describe, it, expect } from "vitest";
import { Match, emptyInput, fighter, move, solid } from "./index";
import { RULES } from "@wbw/shared";
const step = (
  m: Match,
  seconds: number,
  a = emptyInput(),
  b = emptyInput(),
) => {
  for (let i = 0; i < Math.round(seconds / RULES.tick); i++)
    m.step([a, b], RULES.tick);
};
describe("character controller", () => {
  it("allows two jumps and rejects a third until landing", () => {
    const p = fighter(0),
      a = { ...emptyInput(), jump: true };
    move(p, a, RULES.tick);
    expect(p.jumps).toBe(1);
    move(p, a, RULES.tick);
    expect(p.jumps).toBe(2);
    p.vel.y = -1;
    move(p, a, RULES.tick);
    expect(p.vel.y).toBeLessThan(0);
    for (let i = 0; i < 180; i++) move(p, emptyInput(), RULES.tick);
    expect(p.jumps).toBe(0);
    expect(p.pos.y).toBe(0);
  });
  it("constrains movement to arena boundaries", () => {
    const p = fighter(0);
    for (let i = 0; i < 1000; i++)
      move(p, { ...emptyInput(), x: 1 }, RULES.tick);
    expect(p.pos.x).toBeLessThanOrEqual(15.55);
    expect(p.pos.x).toBeGreaterThan(15);
  });
  it("blocks cover and supports landing on elevated cover", () => {
    expect(solid({ x: -6, y: 0, z: -5 }, 0.4)).toBe(true);
    const p = fighter(0);
    p.pos = { x: 0, y: 4, z: 0 };
    for (let i = 0; i < 120; i++) move(p, emptyInput(), RULES.tick);
    expect(p.pos.y).toBe(1.1);
    expect(p.grounded).toBe(true);
  });
});
describe("practice simulation", () => {
  it("enforces fire cooldown and magazine capacity", () => {
    const m = new Match();
    step(m, 0.49, { ...emptyInput(), fire: true });
    expect(m.players[0].shots).toBe(1);
    step(m, 0.1, { ...emptyInput(), fire: true });
    expect(m.players[0].shots).toBe(2);
    m.players[0].ammo = 0;
    step(m, 0.1, { ...emptyInput(), fire: true });
    expect(m.players[0].reload).toBeGreaterThan(0);
    const fired = m.players[0].shots;
    step(m, 1, { ...emptyInput(), fire: true });
    expect(m.players[0].shots).toBe(fired);
    step(m, 0.7);
    expect(m.players[0].ammo).toBe(12);
  });
  it("applies direct-hit damage and tracks accuracy", () => {
    const m = new Match();
    m.players[0].pos = { x: 3, y: 0, z: 10 };
    m.players[1].pos = { x: 3, y: 0, z: 6 };
    m.players[1].protection = 0;
    step(m, 0.3, { ...emptyInput(), fire: true });
    expect(m.players[1].hp).toBe(75);
    expect(m.players[0].hits).toBe(1);
    expect(m.players[0].damage).toBe(25);
  });
  it("protects newly spawned players from damage", () => {
    const m = new Match();
    m.players[0].pos = { x: 3, y: 0, z: 10 };
    m.players[1].pos = { x: 3, y: 0, z: 6 };
    step(m, 0.3, { ...emptyInput(), fire: true });
    expect(m.players[1].hp).toBe(100);
  });
  it("eliminates, scores once, and respawns after three seconds", () => {
    const m = new Match();
    m.players[0].pos = { x: 3, y: 0, z: 10 };
    m.players[1].pos = { x: 3, y: 0, z: 6 };
    m.players[1].protection = 0;
    m.players[1].hp = 25;
    step(m, 0.3, { ...emptyInput(), fire: true });
    expect(m.players[0].score).toBe(1);
    expect(m.players[1].dead).toBeGreaterThan(0);
    step(m, 3);
    expect(m.players[1].hp).toBe(100);
    expect(m.players[1].protection).toBeGreaterThan(0);
    expect(m.players[0].score).toBe(1);
  });
  it("finishes first-to-five and freezes completed matches", () => {
    const m = new Match();
    m.players[0].score = 4;
    m.players[0].pos = { x: 3, y: 0, z: 10 };
    m.players[1].pos = { x: 3, y: 0, z: 6 };
    m.players[1].protection = 0;
    m.players[1].hp = 25;
    step(m, 0.3, { ...emptyInput(), fire: true });
    expect(m.winner).toBe(0);
    expect(m.ended).toBe(true);
    const time = m.time;
    step(m, 10);
    expect(m.time).toBe(time);
  });
  it("awards the leader at time expiry and handles tied sudden death draws", () => {
    const m = new Match();
    m.time = 0.01;
    m.players[1].score = 2;
    step(m, 0.1);
    expect(m.winner).toBe(1);
    const tied = new Match();
    tied.time = 0.01;
    step(tied, 0.1);
    expect(tied.sudden).toBe(true);
    step(tied, 61);
    expect(tied.ended).toBe(true);
    expect(tied.winner).toBe(null);
  });
  it("ends sudden death on elimination without respawning", () => {
    const m = new Match();
    m.sudden = true;
    m.players[0].pos = { x: 3, y: 0, z: 10 };
    m.players[1].pos = { x: 3, y: 0, z: 6 };
    m.players[1].protection = 0;
    m.players[1].hp = 25;
    step(m, 0.3, { ...emptyInput(), fire: true });
    expect(m.ended).toBe(true);
    expect(m.winner).toBe(0);
  });
  it("bursts balloons against cover instead of shooting through it", () => {
    const m = new Match();
    m.players[0].pos = { x: 0, y: 0, z: 5 };
    m.players[1].pos = { x: 0, y: 0, z: -5 };
    m.players[1].protection = 0; // Low central platform permits shoulder-height shots; tall barriers block them.
    m.players[0].pos = { x: -6, y: 0, z: -2 };
    m.players[1].pos = { x: -6, y: 0, z: -8 };
    step(m, 0.4, { ...emptyInput(), fire: true });
    expect(m.players[1].hp).toBe(100);
    expect(m.shots).toHaveLength(0);
    expect(m.splashes.length).toBeGreaterThan(0);
  });
});
