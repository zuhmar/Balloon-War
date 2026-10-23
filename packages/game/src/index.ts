import { COVER, RULES, projectileOrigin, type Vec } from "@wbw/shared";
export type Fighter = {
  pos: Vec;
  vel: Vec;
  hp: number;
  score: number;
  jumps: number;
  grounded: boolean;
  cooldown: number;
  ammo: number;
  reload: number;
  dead: number;
  protection: number;
  yaw: number;
  pitch: number;
  shots: number;
  hits: number;
  damage: number;
};
export type Input = {
  x: number;
  z: number;
  jump: boolean;
  fire: boolean;
  sprint: boolean;
  reload: boolean;
  yaw: number;
  pitch: number;
};
export type Shot = {
  id: number;
  owner: number;
  pos: Vec;
  vel: Vec;
  life: number;
};
export type Splash = { id: number; pos: Vec; life: number; color: string };
export const fighter = (i: number): Fighter => ({
  pos: { x: 0, y: 0, z: i ? -11 : 11 },
  vel: { x: 0, y: 0, z: 0 },
  hp: 100,
  score: 0,
  jumps: 0,
  grounded: true,
  cooldown: 0,
  ammo: 12,
  reload: 0,
  dead: 0,
  protection: 2,
  yaw: i ? Math.PI : 0,
  pitch: 0,
  shots: 0,
  hits: 0,
  damage: 0,
});
export function solid(p: Vec, r = 0) {
  return (
    Math.abs(p.x) > RULES.arena - r ||
    Math.abs(p.z) > RULES.arena - r ||
    COVER.some(
      (b) =>
        Math.abs(p.x - b.x) < b.w / 2 + r &&
        Math.abs(p.z - b.z) < b.d / 2 + r &&
        p.y < b.h &&
        p.y + 1.6 > 0,
    )
  );
}
export function move(p: Fighter, input: Input, dt: number) {
  p.yaw = input.yaw;
  p.pitch = input.pitch;
  const length = Math.hypot(input.x, input.z) || 1;
  const speed = RULES.speed * (input.sprint ? RULES.sprint : 1);
  const s = Math.sin(input.yaw),
    c = Math.cos(input.yaw);
  const vx = ((input.x * c - input.z * s) / Math.max(1, length)) * speed,
    vz = ((-input.x * s - input.z * c) / Math.max(1, length)) * speed;
  const blend = 1 - Math.exp(-(p.grounded ? 18 : 7) * dt);
  p.vel.x += (vx - p.vel.x) * blend;
  p.vel.z += (vz - p.vel.z) * blend;
  if (input.jump && p.jumps < 2) {
    p.vel.y = RULES.jump;
    p.jumps++;
    p.grounded = false;
  }
  p.vel.y -= RULES.gravity * dt;
  const oldY = p.pos.y;
  p.pos.y += p.vel.y * dt;
  p.grounded = false;
  let floor = 0;
  for (const b of COVER)
    if (
      Math.abs(p.pos.x - b.x) < b.w / 2 + 0.25 &&
      Math.abs(p.pos.z - b.z) < b.d / 2 + 0.25 &&
      oldY >= b.h - 0.06 &&
      p.pos.y <= b.h &&
      p.vel.y <= 0
    )
      floor = Math.max(floor, b.h);
  if (p.pos.y <= floor) {
    p.pos.y = floor;
    p.vel.y = 0;
    p.grounded = true;
    p.jumps = 0;
  }
  const nx = { ...p.pos, x: p.pos.x + p.vel.x * dt };
  if (!solid(nx, RULES.radius)) p.pos.x = nx.x;
  const nz = { ...p.pos, z: p.pos.z + p.vel.z * dt };
  if (!solid(nz, RULES.radius)) p.pos.z = nz.z;
}
export class Match {
  players = [fighter(0), fighter(1)];
  shots: Shot[] = [];
  splashes: Splash[] = [];
  time: number = RULES.duration;
  sudden = false;
  ended = false;
  winner: number | null = null;
  id = 0;
  elapsed = 0;
  burst(pos: Vec, color = "#8ff5ff") {
    this.splashes.push({ id: this.id++, pos: { ...pos }, life: 0.6, color });
    if (this.splashes.length > 80) this.splashes.shift();
  }
  step(inputs: Input[], dt: number) {
    if (this.ended) return;
    this.elapsed += dt;
    this.time -= dt;
    if (this.time <= 0) {
      if (this.sudden) {
        this.ended = true;
        return;
      }
      if (this.players[0].score !== this.players[1].score) {
        this.finish(this.players[0].score > this.players[1].score ? 0 : 1);
        return;
      }
      this.sudden = true;
      this.time = RULES.suddenDeath;
    }
    this.players.forEach((p, i) => {
      p.protection = Math.max(0, p.protection - dt);
      p.cooldown = Math.max(0, p.cooldown - dt);
      if (p.dead > 0) {
        p.dead -= dt;
        if (p.dead <= 0) {
          const score = p.score,
            shots = p.shots,
            hits = p.hits,
            damage = p.damage;
          Object.assign(p, fighter(i), { score, shots, hits, damage });
        }
        return;
      }
      if (p.reload > 0) {
        p.reload -= dt;
        if (p.reload <= 0) p.ammo = RULES.magazine;
      }
      const input = inputs[i];
      const jumps = p.jumps;
      move(p, input, dt);
      if (input.jump && jumps === 1) this.burst(p.pos, "#ffe484");
      if (
        (input.reload || p.ammo === 0) &&
        p.reload <= 0 &&
        p.ammo < RULES.magazine
      )
        p.reload = RULES.reload;
      if (input.fire && p.cooldown <= 0 && p.reload <= 0 && p.ammo > 0) {
        p.ammo--;
        p.shots++;
        p.cooldown = RULES.fireCooldown;
        p.protection = 0;
        const cp = Math.cos(input.pitch);
        this.shots.push({
          id: this.id++,
          owner: i,
          pos: projectileOrigin(p.pos, p.yaw),
          vel: {
            x: -Math.sin(p.yaw) * cp * RULES.projectileSpeed,
            y: Math.sin(input.pitch) * RULES.projectileSpeed,
            z: -Math.cos(p.yaw) * cp * RULES.projectileSpeed,
          },
          life: 2,
        });
      }
    });
    this.shots = this.shots.filter((s) => {
      s.life -= dt;
      const target = this.players[1 - s.owner];
      let impact = false;
      // Substeps prevent fast balloons tunneling through players and thin cover.
      for (let k = 0; k < 3 && !impact; k++) {
        s.pos.x += (s.vel.x * dt) / 3;
        s.pos.y += (s.vel.y * dt) / 3;
        s.pos.z += (s.vel.z * dt) / 3;
        if (
          target.dead <= 0 &&
          Math.hypot(s.pos.x - target.pos.x, s.pos.z - target.pos.z) < 0.65 &&
          s.pos.y > target.pos.y &&
          s.pos.y < target.pos.y + 2
        ) {
          impact = true;
          if (target.protection <= 0) {
            target.hp = Math.max(0, target.hp - RULES.damage);
            const attacker = this.players[s.owner];
            attacker.hits++;
            attacker.damage += RULES.damage;
            if (target.hp === 0) {
              attacker.score++;
              target.dead = RULES.respawn;
              if (this.sudden || attacker.score >= RULES.winningScore)
                this.finish(s.owner);
            }
          }
        }
        if (s.pos.y < 0.1 || solid(s.pos, 0.1)) impact = true;
      }
      if (impact) this.burst(s.pos);
      return !impact && s.life > 0;
    });
    this.splashes = this.splashes.filter((s) => (s.life -= dt) > 0);
  }
  finish(i: number) {
    this.ended = true;
    this.winner = i;
  }
}
export const emptyInput = (): Input => ({
  x: 0,
  z: 0,
  jump: false,
  fire: false,
  sprint: false,
  reload: false,
  yaw: 0,
  pitch: 0,
});
export function botInput(m: Match, difficulty: number): Input {
  const bot = m.players[1],
    p = m.players[0],
    dx = p.pos.x - bot.pos.x,
    dz = p.pos.z - bot.pos.z,
    dist = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dx, -dz);
  const t = m.elapsed;
  const out = {
    ...emptyInput(),
    yaw:
      yaw +
      Math.sin(t * 2.7) *
        (difficulty === 0 ? 0.22 : difficulty === 1 ? 0.09 : 0.025),
    pitch: Math.atan2(p.pos.y - bot.pos.y, dist),
    fire: dist < 26 && Math.sin(t * 1.3) > (difficulty === 0 ? 0.3 : -0.7),
    z: dist > 9 ? 1 : dist < 5 ? -1 : 0,
    x: Math.sin(t * 0.8) > 0 ? 0.7 : -0.7,
    sprint: dist > 14,
  };
  const probe = {
    x: bot.pos.x - Math.sin(yaw) * 1.3,
    y: bot.pos.y,
    z: bot.pos.z - Math.cos(yaw) * 1.3,
  };
  out.jump = bot.grounded && solid(probe, 0.5);
  return out;
}
