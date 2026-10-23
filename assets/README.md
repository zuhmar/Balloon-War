# Official Water Balloon War assets

Supplied by the project owner:

| Preserved source | Original upload | SHA-256 |
| --- | --- | --- |
| `source/aqua-blaster-kid.glb` | `Meshy_AI_Aqua_Blaster_Kid_All_Animations.glb` | `35323fc5d6899ce342bcab59f7ca15f659333ff2534f3ebca3328e6d33951f1c` |
| `source/hydrocore-blaster.stl` | `Meshy_AI_Hydrocore_Neon_Blaster_20260808_texture.stl` | `592414e4b07f27ccd7504444b7011ce1fdc626c325e950e68d1e2b3cc5078dbc` |

The originals remain unchanged here. Production serves only the optimized copies from `apps/web/public/assets`.

## Runtime processing

- Character: 8,444,464-byte source → 2,389,508-byte GLB. The embedded 2048×2048 PNG becomes WebP at quality 95 with alpha preserved (`EXT_texture_webp`). Mesh, skin, and all four animation clips remain intact. Requires a browser with WebP support; otherwise the procedural character remains playable.
- Blaster: 294,460 source triangles → 7,998 triangles, 241,032 bytes. Welded vertices, Meshoptimizer simplification (normalized estimated error ~0.001465), regenerated smooth normals, and a compact indexed GLB. STL has no UVs or texture images, so blue/orange/green vertex colors are generated to match the game's palette.
- The character contains a fused built-in gun. The runtime adapter removes that right-hand region and mirrors the supplied left hand with remapped skin weights/UVs, allowing the separate Hydrocore blaster to be equipped without duplicate guns. Source geometry is untouched; the adapted geometry is cached and shared.
- Player and AI have separate cloned skeletons/materials and share immutable geometry/textures. A shader recolors blue outfit regions to coral for the AI without a second texture download.
- Idle, walking, and running clips blend based on speed. Root X/Z motion is removed from runtime clip copies so animation cannot move the gameplay body. The unnamed fourth clip is retained but not assigned an unverified role. Jump, double jump, firing/recoil, reload, damage, elimination, and victory use the existing procedural channels as skeleton overlays.
- Both wrists use two-bone IK. The muzzle retains the existing shared projectile socket; gameplay bounds, movement and damage rules are unchanged. The procedural model is also used while loading or on asset failure.

## Regenerate optimized files

From the repository root after `npm ci`:

```sh
# Optional asset pipeline dependency: Python 3 + Pillow (not needed to build/run the game).
python scripts/prepare-official-character.py
node scripts/prepare-official-blaster.mjs
npm test
npm run build
```

Commit generated GLBs together with source/script changes. Vercel uses the committed optimized files and does not run the Python pipeline. Existing asset tests verify animation data preservation, valid/bounded geometry, in-place clips, and safe fused-prop adaptation.
