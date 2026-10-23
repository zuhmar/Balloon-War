import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { inPlaceClips, prepareOfficialGeometry } from "./official";
function glb(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const length = bytes.readUInt32LE(12);
  return {
    bytes,
    json: JSON.parse(bytes.subarray(20, 20 + length).toString()),
    binary: bytes.subarray(28 + length),
  };
}
describe("official asset delivery", () => {
  it("preserves the supplied skeleton and every animation while reducing texture transfer", () => {
    const source = glb("assets/source/aqua-blaster-kid.glb"),
      runtime = glb("apps/web/public/assets/aqua-blaster-kid.glb");
    expect(runtime.json.skins).toEqual(source.json.skins);
    expect(runtime.json.animations).toEqual(source.json.animations);
    expect(runtime.json.images[0].mimeType).toBe("image/webp");
    expect(runtime.bytes.length).toBeLessThan(source.bytes.length / 2);
    for (const clip of source.json.animations)
      for (const sampler of clip.samplers)
        for (const key of ["input", "output"]) {
          const accessor = source.json.accessors[sampler[key]];
          const a = source.json.bufferViews[accessor.bufferView],
            b = runtime.json.bufferViews[accessor.bufferView];
          expect(
            runtime.binary.subarray(b.byteOffset, b.byteOffset + b.byteLength),
          ).toEqual(
            source.binary.subarray(a.byteOffset, a.byteOffset + a.byteLength),
          );
        }
  });
  it("ships a colored mobile-sized blaster with valid indexed geometry", () => {
    const { json, binary } = glb(
      "apps/web/public/assets/hydrocore-blaster.glb",
    );
    const primitive = json.meshes[0].primitives[0];
    expect(primitive.attributes.COLOR_0).toBeDefined();
    expect(json.accessors[primitive.indices].count / 3).toBeLessThan(10000);
    for (const v of json.bufferViews)
      expect((v.byteOffset ?? 0) + v.byteLength).toBeLessThanOrEqual(
        binary.length,
      );
  });
  it("removes animation root drift without mutating supplied clips", () => {
    const original = new THREE.AnimationClip("Running", 1, [
      new THREE.VectorKeyframeTrack(
        "mixamorigHips.position",
        [0, 1],
        [1, 2, 3, 4, 5, 6],
      ),
    ]);
    const [clip] = inPlaceClips([original]);
    expect(Array.from(clip.tracks[0].values)).toEqual([1, 2, 3, 1, 5, 3]);
    expect(Array.from(original.tracks[0].values)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("removes the fused old weapon and restores a mirrored skinned hand without changing the source", () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          1, 0, 0, 1, 1, 0, 2, 0, 0, -5, 0, 0, -5, 1, 0, -6, 0, 0, 0, 0, 0, 0,
          1, 0, 0, 0, 1,
        ],
        3,
      ),
    );
    g.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(
        Array.from({ length: 9 }, () => [0, 0, 1]).flat(),
        3,
      ),
    );
    g.setAttribute(
      "skinIndex",
      new THREE.Uint8BufferAttribute(
        [
          15, 0, 0, 0, 15, 0, 0, 0, 15, 0, 0, 0, 19, 0, 0, 0, 19, 0, 0, 0, 19,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ],
        4,
      ),
    );
    g.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(
        Array.from({ length: 9 }, () => [1, 0, 0, 0]).flat(),
        4,
      ),
    );
    g.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const adapted = prepareOfficialGeometry(g);
    expect(adapted.index!.count).toBe(9);
    expect(g.getAttribute("position").getX(3)).toBe(-5);
    const positions = adapted.getAttribute("position"),
      joints = adapted.getAttribute("skinIndex");
    let mirrored = 0;
    for (let i = 0; i < positions.count; i++) {
      expect(positions.getX(i)).toBeGreaterThan(-3);
      if (joints.getX(i) === 19) {
        mirrored++;
        expect(positions.getX(i)).toBeLessThan(0);
      }
    }
    expect(mirrored).toBe(3);
    expect(prepareOfficialGeometry(g)).toBe(adapted);
    g.dispose();
    adapted.dispose();
  });
});
