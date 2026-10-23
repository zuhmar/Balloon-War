// Usage: node scripts/prepare-official-blaster.mjs /path/to/source.stl [output.glb]
import fs from "node:fs/promises";
import process from "node:process";
import { Buffer } from "node:buffer";
import console from "node:console";
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "meshoptimizer";
const [
  input = "assets/source/hydrocore-blaster.stl",
  output = "apps/web/public/assets/hydrocore-blaster.glb",
] = process.argv.slice(2);
if (!input) throw new Error("Provide the official source STL path.");
const bytes = await fs.readFile(input);
const source = new STLLoader().parse(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
source.deleteAttribute("normal");
source.deleteAttribute("color");
const welded = mergeVertices(source, 0.0001);
await MeshoptSimplifier.ready;
const positions = welded.attributes.position.array;
const [reduced, error] = MeshoptSimplifier.simplify(
  new Uint32Array(welded.index.array),
  positions,
  3,
  24000,
  0.005,
);
const [remap, count] = MeshoptSimplifier.compactMesh(reduced);
const compact = new Float32Array(count * 3);
for (let old = 0; old < remap.length; old++)
  if (remap[old] !== 0xffffffff) {
    const i = remap[old];
    compact[i * 3] = (positions[old * 3 + 1] / 94.5) * 0.8;
    compact[i * 3 + 1] = (positions[old * 3 + 2] / 94.5) * 0.8;
    compact[i * 3 + 2] = (positions[old * 3] / 94.5) * 0.8;
  }
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(compact, 3));
geometry.setIndex(new THREE.BufferAttribute(reduced, 1));
geometry.computeVertexNormals();
const colors = new Float32Array(count * 3);
for (let old = 0; old < remap.length; old++)
  if (remap[old] !== 0xffffffff) {
    const x = positions[old * 3],
      height = positions[old * 3 + 2];
    const color = new THREE.Color(
      x < -43
        ? "#ff9638"
        : height > 40 && x < 20
          ? "#76d840"
          : height < 17
            ? "#183e67"
            : x > 42
              ? "#ffac40"
              : "#188ee0",
    );
    color.toArray(colors, remap[old] * 3);
  }
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.32,
    metalness: 0.04,
  }),
);
mesh.name = "Official Hydrocore Blaster";
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const result = await new GLTFExporter().parseAsync(mesh, { binary: true });
await fs.writeFile(output, Buffer.from(result));
console.log({
  sourceTriangles: source.attributes.position.count / 3,
  runtimeTriangles: reduced.length / 3,
  vertices: count,
  error,
  bytes: result.byteLength,
});
