import type { Fighter } from "@wbw/game";
import { RULES } from "@wbw/shared";
export type AnimationContext = {
  dt: number;
  time: number;
  pitch: number;
  paused: boolean;
  display: boolean;
  victory: boolean;
};
export type CharacterPose = ReturnType<typeof createAnimationState>;
export function createAnimationState() {
  return {
    phase: 0,
    forward: 0,
    strafe: 0,
    speed: 0,
    recoil: 0,
    hurt: 0,
    doubleJump: 0,
    landing: 0,
    death: 0,
    celebrate: 0,
    reload: 0,
    pitch: 0,
    breath: 0,
    blink: 1,
    air: 0,
    previousHp: 100,
    previousShots: 0,
    previousJumps: 0,
    previousGrounded: true,
    previousDead: false,
  };
}
const damp = (a: number, b: number, rate: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));
/** Rendering-only channels. Does not mutate simulation state or gameplay rules. */
export function animateCharacter(
  a: CharacterPose,
  p: Fighter,
  c: AnimationContext,
) {
  const dt = c.paused && !c.display ? 0 : Math.min(c.dt, 0.1);
  if (!c.display && p.shots > a.previousShots) a.recoil = 1;
  if (!c.display && p.hp < a.previousHp) a.hurt = 1;
  if (!c.display && p.jumps === 2 && a.previousJumps !== 2) a.doubleJump = 1;
  if (!c.display && p.grounded && !a.previousGrounded) a.landing = 1;
  const dead = !c.display && p.dead > 0;
  if (!dead && a.previousDead) a.death = 0;
  a.death = dead ? Math.min(1, a.death + dt * 2.8) : 0;
  a.recoil = Math.max(0, a.recoil - dt * 7);
  a.hurt = Math.max(0, a.hurt - dt * 3);
  a.doubleJump = Math.max(0, a.doubleJump - dt * 2.5);
  a.landing = Math.max(0, a.landing - dt * 6);
  const forward = -p.vel.x * Math.sin(p.yaw) - p.vel.z * Math.cos(p.yaw);
  const strafe = p.vel.x * Math.cos(p.yaw) - p.vel.z * Math.sin(p.yaw);
  const stationary = c.display || c.victory || dead;
  a.forward = damp(a.forward, stationary ? 0 : forward, 12, dt);
  a.strafe = damp(a.strafe, stationary ? 0 : strafe, 12, dt);
  a.speed = damp(a.speed, stationary ? 0 : Math.hypot(p.vel.x, p.vel.z), 12, dt);
  a.phase += dt * (3 + a.speed * 1.8);
  a.celebrate = damp(a.celebrate, c.victory ? 1 : 0, 5, dt);
  a.reload = damp(
    a.reload,
    !c.display && p.reload > 0
      ? Math.sin(
          Math.PI * Math.max(0, Math.min(1, 1 - p.reload / RULES.reload)),
        )
      : 0,
    18,
    dt,
  );
  a.pitch = damp(a.pitch, c.pitch, 20, dt);
  a.breath = Math.sin(c.time * 2.8) * 0.012;
  a.blink = c.time % 4.6 > 4.42 ? 0.12 : 1;
  a.air = damp(a.air, p.grounded || stationary ? 0 : 1, 12, dt);
  a.previousHp = p.hp;
  a.previousShots = p.shots;
  a.previousJumps = p.jumps;
  a.previousGrounded = p.grounded;
  a.previousDead = dead;
  return a;
}
