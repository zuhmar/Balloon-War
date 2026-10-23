import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { fighter, Match, emptyInput } from "@wbw/game";
import { WEAPON_SOCKET, RULES } from "@wbw/shared";
import {
  animateCharacter,
  createAnimationState,
  type AnimationContext,
} from "./animation";
import { createCharacterRig } from "./model";
const context = (values: Partial<AnimationContext> = {}): AnimationContext => ({
  dt: 1 / 60,
  time: 1,
  pitch: 0,
  paused: false,
  display: false,
  victory: false,
  ...values,
});
describe("procedural character animation", () => {
  it("blends running and signed strafing, rather than snapping", () => {
    const p = fighter(0),
      a = createAnimationState();
    p.vel = { x: 6, y: 0, z: -6 };
    animateCharacter(a, p, context());
    expect(a.forward).toBeGreaterThan(0);
    expect(a.strafe).toBeGreaterThan(0);
    expect(a.speed).toBeLessThan(Math.hypot(6, 6));
    p.vel.x = -6;
    for (let i = 0; i < 60; i++) animateCharacter(a, p, context());
    expect(a.strafe).toBeLessThan(0);
  });
  it("detects double jump, landing, shooting, damage, reload, death and respawn", () => {
    const p = fighter(0),
      a = createAnimationState();
    p.grounded = false;
    p.jumps = 2;
    p.shots = 1;
    p.hp = 75;
    p.reload = RULES.reload / 2;
    animateCharacter(a, p, context());
    expect(a.doubleJump).toBeGreaterThan(0.9);
    expect(a.recoil).toBeGreaterThan(0.8);
    expect(a.hurt).toBeGreaterThan(0.9);
    expect(a.reload).toBeGreaterThan(0);
    p.grounded = true;
    p.jumps = 0;
    animateCharacter(a, p, context());
    expect(a.landing).toBeGreaterThan(0.8);
    p.dead = 3;
    for (let i = 0; i < 30; i++) animateCharacter(a, p, context());
    expect(a.death).toBe(1);
    p.dead = 0;
    p.hp = 100;
    animateCharacter(a, p, context());
    expect(a.death).toBe(0);
  });
  it("freezes animation time under pause and blends victory", () => {
    const p = fighter(0),
      a = createAnimationState();
    p.vel.z = -6;
    p.grounded = false;
    animateCharacter(a, p, context());
    expect(a.speed).toBeGreaterThan(0);
    expect(a.air).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++)
      animateCharacter(a, p, context({ victory: true }));
    expect(a.celebrate).toBeGreaterThan(0.99);
    expect(a.speed).toBeLessThan(0.01);
    expect(a.air).toBeLessThan(0.01);
    const before = { ...a };
    animateCharacter(a, p, context({ paused: true, victory: true }));
    expect(a.phase).toBe(before.phase);
    expect(a.celebrate).toBe(before.celebrate);
  });
  it("keeps menu showcase alive after a player elimination", () => {
    const p = fighter(0),
      a = createAnimationState();
    p.dead = 3;
    p.hp = 0;
    p.reload = 0.75;
    for (let i = 0; i < 60; i++)
      animateCharacter(a, p, context({ display: true }));
    expect(a.death).toBe(0);
    expect(a.hurt).toBe(0);
    expect(a.reload).toBe(0);
  });
  it("uses time-based smoothing consistently across frame rates", () => {
    const p = fighter(0);
    p.vel.z = -6;
    const a = createAnimationState(),
      b = createAnimationState();
    for (let i = 0; i < 30; i++)
      animateCharacter(a, p, context({ dt: 1 / 30 }));
    for (let i = 0; i < 60; i++)
      animateCharacter(b, p, context({ dt: 1 / 60 }));
    expect(a.speed).toBeCloseTo(b.speed, 8);
    expect(a.forward).toBeCloseTo(b.forward, 8);
  });
});
describe("procedural asset contract", () => {
  it("keeps actual fired projectile and visual muzzle aligned across aiming/recoil poses", () => {
    const rig = createCharacterRig(0);
    try {
      for (const yaw of [0, Math.PI / 2, -2.1])
        for (const pitch of [-0.65, 0, 0.65]) {
          const m = new Match(),
            p = m.players[0];
          p.pos = { x: 3, y: 2, z: 10 };
          m.step(
            [{ ...emptyInput(), fire: true, yaw, pitch }, emptyInput()],
            RULES.tick,
          );
          const shot = m.shots[0];
          expect(shot).toBeDefined();
          rig.root.position.set(p.pos.x, p.pos.y, p.pos.z);
          rig.root.rotation.y = yaw;
          rig.weapon.position.set(
            0,
            WEAPON_SOCKET.height,
            -WEAPON_SOCKET.forward,
          );
          rig.weapon.rotation.set(pitch, 0, 0.2);
          rig.weapon.scale.z = 0.87;
          rig.root.updateMatrixWorld(true);
          const actual = rig.muzzle.getWorldPosition(new THREE.Vector3()); // Shots have already traveled one tick.
          expect(actual.x).toBeCloseTo(shot.pos.x - shot.vel.x * RULES.tick, 8);
          expect(actual.y).toBeCloseTo(shot.pos.y - shot.vel.y * RULES.tick, 8);
          expect(actual.z).toBeCloseTo(shot.pos.z - shot.vel.z * RULES.tick, 8);
        }
    } finally {
      rig.dispose();
    }
  });
  it("batches a detailed, replaceable rig within a mobile geometry budget", () => {
    const rig = createCharacterRig(0);
    try {
      let draws = 0,
        triangles = 0;
      rig.root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          draws++;
          triangles +=
            (o.geometry.index?.count ?? o.geometry.attributes.position.count) /
            3;
        }
      });
      expect(draws).toBeLessThan(70);
      expect(triangles).toBeLessThan(35000);
      expect(rig.arms).toHaveLength(2);
      expect(rig.legs).toHaveLength(2);
      expect(rig.muzzle.name).toBe("projectile-origin");
    } finally {
      rig.dispose();
    }
  });
});
