export const RULES = {
  hp: 100,
  damage: 25,
  fireCooldown: 0.5,
  magazine: 12,
  reload: 1.5,
  respawn: 3,
  protection: 2,
  winningScore: 5,
  duration: 300,
  suddenDeath: 60,
  tick: 1 / 60,
  speed: 6,
  sprint: 1.4,
  jump: 8,
  gravity: 22,
  projectileSpeed: 24,
  radius: 0.45,
  arena: 16,
} as const;
export type Vec = { x: number; y: number; z: number };
export const COVER = [
  { x: -6, z: -5, w: 4, d: 1.4, h: 1.6, color: "#ffb642" },
  { x: 6, z: 5, w: 4, d: 1.4, h: 1.6, color: "#ffb642" },
  { x: 6, z: -5, w: 1.4, d: 4, h: 1.6, color: "#ad8aff" },
  { x: -6, z: 5, w: 1.4, d: 4, h: 1.6, color: "#ad8aff" },
  { x: 0, z: 0, w: 4, d: 4, h: 1.1, color: "#40cfc9" },
  { x: -11, z: 0, w: 2, d: 5, h: 1, color: "#ff7e92" },
  { x: 11, z: 0, w: 2, d: 5, h: 1, color: "#ff7e92" },
];

/** Local-space muzzle socket; shared by simulation and replaceable character assets. */
export const WEAPON_SOCKET = { height: 1.3, forward: 0.8 } as const;
export function projectileOrigin(position: Vec, yaw: number): Vec {
  return {
    x: position.x - Math.sin(yaw) * WEAPON_SOCKET.forward,
    y: position.y + WEAPON_SOCKET.height,
    z: position.z - Math.cos(yaw) * WEAPON_SOCKET.forward,
  };
}
