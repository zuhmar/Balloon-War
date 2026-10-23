import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { WEAPON_SOCKET } from "@wbw/shared";
const geometryCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
/** The official mesh contains a fused old prop. Replace its right-hand region with the
 * mirrored, identically textured left hand so the separate official blaster can be equipped.
 * Source GLB and cached loader geometry remain unmodified. */
export function prepareOfficialGeometry(source: THREE.BufferGeometry) {
  const cached = geometryCache.get(source);
  if (cached) return cached;
  const joints = source.getAttribute("skinIndex"),
    weights = source.getAttribute("skinWeight"),
    indices = source.index!;
  const influence = (v: number, joint: number) => {
    let w = 0;
    for (let k = 0; k < 4; k++)
      if (joints.array[v * 4 + k] === joint) w += weights.array[v * 4 + k];
    return w;
  };
  const keep: number[] = [],
    mirror: number[] = [],
    vertices = new Map<number, number>();
  const original = source.getAttribute("position").count;
  for (let i = 0; i < indices.count; i += 3) {
    const tri = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
    if (!tri.some((v) => influence(v, 19) > 0.3)) keep.push(...tri);
    if (tri.some((v) => influence(v, 15) > 0.3)) {
      const mapped = tri.map((v) => {
        if (!vertices.has(v)) vertices.set(v, original + vertices.size);
        return vertices.get(v)!;
      });
      mirror.push(mapped[0], mapped[2], mapped[1]);
    }
  }
  const out = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const sourceArray = attribute.array;
    const ArrayType = sourceArray.constructor as {
      new (length: number): THREE.TypedArray;
    };
    const data = new ArrayType((original + vertices.size) * attribute.itemSize);
    data.set(sourceArray);
    for (const [old, v] of vertices)
      for (let k = 0; k < attribute.itemSize; k++) {
        let value = sourceArray[old * attribute.itemSize + k];
        if (
          (name === "position" || name === "normal" || name === "tangent") &&
          k === 0
        )
          value = -value;
        if (name === "tangent" && k === 3) value = -value;
        if (name === "skinIndex" && value >= 12 && value <= 15) value += 4;
        data[v * attribute.itemSize + k] = value;
      }
    out.setAttribute(
      name,
      new THREE.BufferAttribute(data, attribute.itemSize, attribute.normalized),
    );
  }
  out.setIndex([...keep, ...mirror]);
  const compact = mergeVertices(out, 0.000001);
  out.dispose();
  compact.computeBoundingSphere();
  geometryCache.set(source, compact);
  return compact;
}
export function inPlaceClips(clips: THREE.AnimationClip[]) {
  return clips.map((clip) => {
    const result = clip.clone();
    for (const track of result.tracks)
      if (/Hips\.position$/.test(track.name)) {
        const x = track.values[0],
          z = track.values[2];
        for (let i = 0; i < track.values.length; i += 3) {
          track.values[i] = x;
          track.values[i + 2] = z;
        }
      }
    return result;
  });
}
export function createOfficialRig(
  source: THREE.Group,
  gunSource: THREE.Group,
  clips: THREE.AnimationClip[],
  team: number,
) {
  const root = new THREE.Group();
  root.name = "character-root";
  root.userData.official = true;
  const visual = new THREE.Group(),
    normalizer = new THREE.Group(),
    model = clone(source);
  root.add(visual);
  visual.add(normalizer);
  normalizer.add(model);
  const ownedMaterials: THREE.Material[] = [];
  const skeletons: THREE.Skeleton[] = [];
  model.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) {
      o.geometry = prepareOfficialGeometry(o.geometry);
      skeletons.push(o.skeleton);
      o.frustumCulled = false;
      const original = Array.isArray(o.material) ? o.material[0] : o.material;
      const material = original.clone() as THREE.MeshStandardMaterial;
      material.roughness = 0.42;
      material.metalness = 0.02;
      if (team) {
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
 float teamMask = smoothstep(0.025, 0.18, diffuseColor.b - max(diffuseColor.r, diffuseColor.g * 0.8));
 diffuseColor.rgb = mix(diffuseColor.rgb, vec3(diffuseColor.b, diffuseColor.g * 0.38, diffuseColor.b * 0.15), teamMask);`,
          );
        };
        material.customProgramCacheKey = () => "official-coral-team";
      }
      o.material = material;
      ownedMaterials.push(material);
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true),
    size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  // Model faces +Z; gameplay faces -Z. Ground/scale the visual only; physics stays unchanged.
  const scale = 2 / size.y;
  model.position.set(-center.x, -box.min.y, -center.z);
  normalizer.scale.setScalar(scale);
  normalizer.rotation.y = Math.PI;
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if (o instanceof THREE.Bone)
      bones.set(o.name.replace(/[^a-z0-9]/gi, ""), o);
  });
  const bone = (name: string) => {
    const b = bones.get("mixamorig" + name);
    if (!b) throw new Error(`Official character is missing ${name}`);
    return b;
  };
  const weapon = new THREE.Group();
  weapon.name = "muzzle-socket";
  weapon.position.set(0, WEAPON_SOCKET.height, -WEAPON_SOCKET.forward);
  visual.add(weapon);
  const gun = gunSource.clone(true);
  weapon.add(gun);
  // Optimized STL uses -Z as forward, with the barrel tip at -0.4 and centerline ~0.30 high.
  gun.position.set(-0.00085, -0.2855, (47.29621887207031 / 94.5) * 0.8);
  const muzzle = new THREE.Object3D();
  muzzle.name = "projectile-origin";
  weapon.add(muzzle);
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
  shield.visible = false;
  root.add(shield);
  const mixer = new THREE.AnimationMixer(model);
  const actions = inPlaceClips(clips).map((c) => mixer.clipAction(c).play());
  const idle = actions.find((a) => /idle/i.test(a.getClip().name))!;
  const run = actions.find((a) => /running/i.test(a.getClip().name))!;
  const walk = actions.find((a) => /walking/i.test(a.getClip().name))!;
  for (const a of actions) a.setEffectiveWeight(a === idle ? 1 : 0);
  const arms = ["Left", "Right"].map((side) => ({
    upper: bone(side + "Arm"),
    lower: bone(side + "ForeArm"),
    hand: bone(side + "Hand"),
    side: side === "Left" ? -1 : 1,
  }));
  return {
    root,
    visual,
    model,
    weapon,
    muzzle,
    shield,
    mixer,
    actions,
    idle,
    run,
    walk,
    arms,
    hips: bone("Hips"),
    head: bone("Head"),
    spine: bone("Spine2"),
    legs: ["Left", "Right"].map((side) => ({
      upper: bone(side + "UpLeg"),
      lower: bone(side + "Leg"),
    })),
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      ownedMaterials.forEach((m) => m.dispose());
      skeletons.forEach((s) => s.dispose());
      shield.geometry.dispose();
      (shield.material as THREE.Material).dispose();
    },
  };
}
