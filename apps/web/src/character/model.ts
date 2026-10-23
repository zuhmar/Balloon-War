import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type V = [number, number, number];
type Shape = {
  shape: "ball" | "tube" | "spike" | "ring";
  color: string;
  at: V;
  size: V;
  rotation?: V;
};
export type CharacterRig = ReturnType<typeof createCharacterRig>;
/** Geometry factory is the asset adapter: a future GLB rig can implement the same sockets. */
export function createCharacterRig(team: number) {
  const blue = team ? "#f47751" : "#168fe5",
    darkBlue = team ? "#b94e3b" : "#1763b3";
  const white = "#fff9ed",
    skin = "#f4bc87",
    brown = "#633c29",
    black = "#202c3b";
  const primitives = {
    ball: new THREE.SphereGeometry(1, 16, 12),
    tube: new THREE.CylinderGeometry(1, 1, 1, 12),
    spike: new THREE.ConeGeometry(1, 1, 7),
    ring: new THREE.TorusGeometry(1, 0.22, 6, 16),
  };
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries: THREE.BufferGeometry[] = [];
  function material(color: string) {
    let m = materials.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: color === brown ? 0.46 : 0.28,
        metalness: 0.04,
      });
      materials.set(color, m);
    }
    return m;
  }
  function batch(shapes: Shape[]) {
    const group = new THREE.Group();
    const buckets = new Map<string, THREE.BufferGeometry[]>();
    for (const s of shapes) {
      const g = primitives[s.shape].clone();
      const transform = new THREE.Matrix4().compose(
        new THREE.Vector3(...s.at),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(...(s.rotation ?? [0, 0, 0])),
        ),
        new THREE.Vector3(...s.size),
      );
      g.applyMatrix4(transform);
      const bucket = buckets.get(s.color) ?? [];
      bucket.push(g);
      buckets.set(s.color, bucket);
    }
    for (const [color, parts] of buckets) {
      const g = mergeGeometries(parts);
      parts.forEach((p) => p.dispose());
      geometries.push(g);
      const mesh = new THREE.Mesh(g, material(color));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
  const ball = (color: string, at: V, size: V, rotation?: V): Shape => ({
    shape: "ball",
    color,
    at,
    size,
    rotation,
  });
  const tube = (color: string, at: V, size: V, rotation?: V): Shape => ({
    shape: "tube",
    color,
    at,
    size,
    rotation,
  });
  const ring = (color: string, at: V, size: V, rotation?: V): Shape => ({
    shape: "ring",
    color,
    at,
    size,
    rotation,
  });
  const root = new THREE.Group(),
    visual = new THREE.Group(),
    torso = new THREE.Group(),
    head = new THREE.Group(),
    weapon = new THREE.Group();
  root.name = "character-root";
  visual.name = "visual-motion";
  torso.name = "spine";
  head.name = "head";
  weapon.name = "muzzle-socket";
  root.add(visual);
  visual.add(torso);
  torso.position.y = 0.97;
  head.position.y = 0.64;
  torso.add(head);
  // White padded hoodie, blue cuffs/hem, drawstrings, pocket, shoulder straps and reservoir.
  torso.add(
    batch([
      ball(white, [0, 0, 0], [0.42, 0.4, 0.28]),
      ball(blue, [0, -0.29, 0], [0.39, 0.1, 0.26]),
      ball(white, [0, 0.28, 0.14], [0.36, 0.21, 0.23]),
      ring(blue, [0, 0.29, -0.02], [0.22, 0.12, 0.2], [Math.PI / 2, 0, 0]),
      ball("#dfebed", [0, -0.1, -0.267], [0.23, 0.12, 0.025]),
      tube(blue, [-0.1, 0.12, -0.28], [0.018, 0.22, 0.018], [0, 0, -0.1]),
      tube(blue, [0.1, 0.12, -0.28], [0.018, 0.22, 0.018], [0, 0, 0.1]),
      ball(white, [-0.11, 0, -0.29], [0.03, 0.04, 0.025]),
      ball(white, [0.11, 0, -0.29], [0.03, 0.04, 0.025]),
      ball(darkBlue, [-0.27, 0.04, 0], [0.045, 0.32, 0.285]),
      ball(darkBlue, [0.27, 0.04, 0], [0.045, 0.32, 0.285]),
      ball("#0879cc", [0, 0.02, 0.33], [0.3, 0.36, 0.16]),
      ball("#35c7f2", [0, 0.04, 0.46], [0.23, 0.27, 0.06]),
      tube("#ffae36", [0, 0.37, 0.35], [0.11, 0.08, 0.11]),
      ball(white, [0, 0.06, 0.51], [0.055, 0.14, 0.012]),
      ring(
        "#16c9a6",
        [0.29, -0.1, 0.3],
        [0.19, 0.28, 0.2],
        [0, Math.PI / 2, 0],
      ),
    ]),
  );
  // Head: cheeks, ears, nose, layered swept brown hair and forehead goggles.
  const hair: Shape[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    hair.push({
      shape: "spike",
      color: i % 3 ? "#633c29" : "#805139",
      at: [
        Math.cos(angle) * 0.32,
        0.38 + (i % 2) * 0.035,
        Math.sin(angle) * 0.22 + 0.035,
      ],
      size: [0.19, 0.42 + (i % 3) * 0.045, 0.18],
      rotation: [Math.sin(angle) * 0.4, angle, -Math.cos(angle) * 0.45],
    });
  }
  head.add(
    batch([
      ball(skin, [0, 0, 0], [0.46, 0.44, 0.37]),
      ball("#f8c99c", [0, -0.14, -0.14], [0.39, 0.25, 0.29]),
      ball(skin, [-0.46, -0.02, 0], [0.1, 0.14, 0.09]),
      ball(skin, [0.46, -0.02, 0], [0.1, 0.14, 0.09]),
      ball("#d98c67", [-0.48, -0.02, -0.035], [0.045, 0.08, 0.025]),
      ball("#d98c67", [0.48, -0.02, -0.035], [0.045, 0.08, 0.025]),
      ball(skin, [0, -0.03, -0.37], [0.09, 0.1, 0.1]),
      ball("#db8f73", [-0.28, -0.13, -0.31], [0.08, 0.035, 0.012]),
      ball("#db8f73", [0.28, -0.13, -0.31], [0.08, 0.035, 0.012]),
      ball(brown, [0, 0.23, 0.07], [0.47, 0.29, 0.36]),
      ...hair,
      ball(brown, [-0.37, 0.06, 0], [0.07, 0.21, 0.27]),
      ball(brown, [0.37, 0.06, 0], [0.07, 0.21, 0.27]),
      ring("#1268b8", [0, 0.24, 0], [0.47, 0.38, 0.09], [Math.PI / 2, 0, 0]),
      ...[-1, 1].flatMap((side) => [
        ball("#158fe5", [side * 0.205, 0.27, -0.325], [0.19, 0.135, 0.08]),
        ball("#62e2f5", [side * 0.205, 0.27, -0.395], [0.14, 0.09, 0.035]),
        ball("#c4fbff", [side * 0.23, 0.3, -0.425], [0.04, 0.025, 0.008]),
      ]),
      tube(
        "#ffb12e",
        [0, 0.27, -0.34],
        [0.035, 0.12, 0.035],
        [0, 0, Math.PI / 2],
      ),
      // Open smile with white teeth.
      ball("#713e35", [0, -0.22, -0.35], [0.16, 0.08, 0.035]),
      ball(white, [0, -0.19, -0.377], [0.12, 0.025, 0.01]),
      ball("#e78b86", [0, -0.255, -0.37], [0.07, 0.02, 0.01]),
    ]),
  );
  const eyes = new THREE.Group(),
    brows = new THREE.Group();
  head.add(eyes, brows);
  eyes.add(
    batch(
      [-1, 1].flatMap((side) => [
        ball(white, [side * 0.19, 0.04, -0.33], [0.14, 0.16, 0.07]),
        ball("#205e86", [side * 0.19, 0.035, -0.393], [0.075, 0.105, 0.025]),
        ball("#142a3c", [side * 0.19, 0.035, -0.415], [0.043, 0.074, 0.012]),
        ball(white, [side * 0.21, 0.07, -0.426], [0.018, 0.026, 0.009]),
      ]),
    ),
  );
  brows.add(
    batch(
      [-1, 1].map((side) =>
        ball(
          brown,
          [side * 0.195, 0.18, -0.365],
          [0.15, 0.032, 0.022],
          [0, 0, side * 0.12],
        ),
      ),
    ),
  );
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group(),
      knee = new THREE.Group();
    hip.position.set(side * 0.23, 0.66, 0);
    knee.position.y = -0.28;
    visual.add(hip);
    hip.add(knee);
    hip.add(
      batch([
        ball(black, [0, -0.09, 0], [0.21, 0.23, 0.23]),
        ball(darkBlue, [side * 0.16, -0.1, 0], [0.035, 0.16, 0.17]),
      ]),
    );
    knee.add(
      batch([
        ball(skin, [0, -0.09, 0], [0.115, 0.17, 0.12]),
        tube(white, [0, -0.19, 0], [0.12, 0.12, 0.12]),
        ball(white, [0, -0.26, -0.08], [0.22, 0.14, 0.34]),
        ball(blue, [0, -0.22, -0.08], [0.2, 0.12, 0.29]),
        ball(white, [0, -0.18, -0.2], [0.14, 0.06, 0.14]),
        ball(darkBlue, [side * 0.18, -0.23, -0.08], [0.025, 0.06, 0.16]),
        ...[-0.18, -0.12, -0.06].map((z) =>
          tube(
            white,
            [0, -0.135, z],
            [0.015, 0.24, 0.015],
            [0, 0, Math.PI / 2],
          ),
        ),
      ]),
    );
    return { hip, knee };
  });
  // Weapon coordinates use its muzzle as origin. All geometry sits behind the nozzle.
  weapon.add(
    batch([
      tube("#ff9135", [0, 0, 0.14], [0.14, 0.28, 0.14], [Math.PI / 2, 0, 0]),
      ring("#94e84a", [0, 0, 0.025], [0.16, 0.16, 0.16]),
      ball("#124e83", [0, 0, 0.01], [0.095, 0.095, 0.012]),
      ball("#138cda", [0, 0, 0.42], [0.21, 0.18, 0.3]),
      ball("#43b7f3", [0, 0.05, 0.47], [0.19, 0.13, 0.23]),
      ball("#73d63d", [0, 0.21, 0.46], [0.13, 0.19, 0.18]),
      ball("#b2f066", [0, 0.27, 0.43], [0.1, 0.08, 0.12]),
      ball("#ff963b", [0, -0.2, 0.56], [0.09, 0.19, 0.09], [0.2, 0, 0]),
      ring("#ffb74c", [0, -0.16, 0.42], [0.08, 0.1, 0.08], [0, Math.PI / 2, 0]),
      ball("#ff9a35", [0, 0.03, 0.72], [0.18, 0.13, 0.1]),
      ...[-1, 1].map((side) =>
        ball("#a5f254", [side * 0.195, 0.02, 0.43], [0.015, 0.055, 0.12]),
      ),
    ]),
  );
  visual.add(weapon);
  const muzzle = new THREE.Object3D();
  muzzle.name = "projectile-origin";
  weapon.add(muzzle);
  // Two-bone arms use named shoulder/elbow/grip joints, independently of the asset geometry.
  const arms = [-1, 1].map((side) => {
    const upper = new THREE.Group(),
      lower = new THREE.Group(),
      hand = new THREE.Group();
    visual.add(upper, lower, hand);
    upper.add(
      batch([
        ball(white, [0, 0.5, 0], [0.155, 0.53, 0.155]),
        tube(blue, [0, 0.95, 0], [0.14, 0.1, 0.14]),
      ]),
    );
    lower.add(batch([ball(skin, [0, 0.5, 0], [0.1, 0.52, 0.1])]));
    hand.add(
      batch([
        ball(black, [0, 0, 0], [0.13, 0.105, 0.13]),
        ball(skin, [0, -0.015, -0.105], [0.09, 0.06, 0.045]),
        ball(skin, [side * 0.11, 0, -0.02], [0.05, 0.06, 0.07]),
        ...[-0.06, -0.02, 0.02, 0.06].map((x) =>
          ball(skin, [x, -0.055, -0.1], [0.021, 0.035, 0.04]),
        ),
      ]),
    );
    return { upper, lower, hand, side };
  });
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 16, 12),
    new THREE.MeshStandardMaterial({
      color: "#9ceeff",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    }),
  );
  shield.position.y = 1;
  root.add(shield);
  shield.visible = false;
  return {
    root,
    visual,
    torso,
    head,
    eyes,
    brows,
    legs,
    arms,
    weapon,
    muzzle,
    shield,
    materials,
    dispose() {
      geometries.forEach((g) => g.dispose());
      Object.values(primitives).forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      shield.geometry.dispose();
      (shield.material as THREE.Material).dispose();
    },
  };
}
