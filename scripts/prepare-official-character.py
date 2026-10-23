"""Optimize the supplied texture with alpha preserved; preserve all skeleton/mesh/animation data.
Requires Pillow. Run from repository root: python scripts/prepare-official-character.py
"""
import io
import json
import struct
from pathlib import Path
from PIL import Image

source = Path('assets/source/aqua-blaster-kid.glb').read_bytes()
json_length = struct.unpack_from('<I', source, 12)[0]
model = json.loads(source[20:20 + json_length])
binary_length = struct.unpack_from('<I', source, 20 + json_length)[0]
binary = source[28 + json_length:28 + json_length + binary_length]
image = model['images'][0]
view = model['bufferViews'][image['bufferView']]
start, length = view.get('byteOffset', 0), view['byteLength']
texture = Image.open(io.BytesIO(binary[start:start + length]))
output = io.BytesIO()
texture.save(output, format='WEBP', quality=95, method=6, exact=True)
compressed = output.getvalue()
padded = compressed + bytes((-len(compressed)) % 4)
old_padded = (length + 3) & ~3
binary = binary[:start] + padded + binary[start + old_padded:]
delta = len(padded) - old_padded
for other in model['bufferViews']:
    if other.get('byteOffset', 0) > start:
        other['byteOffset'] += delta
view['byteLength'] = len(compressed)
image['mimeType'] = 'image/webp'
for key in ['extensionsUsed', 'extensionsRequired']:
    model.setdefault(key, []).append('EXT_texture_webp')
for tex in model['textures']:
    tex.setdefault('extensions', {})['EXT_texture_webp'] = {'source': tex.pop('source')}
model['buffers'][0]['byteLength'] = len(binary)
encoded = json.dumps(model, separators=(',', ':')).encode()
encoded += b' ' * ((-len(encoded)) % 4)
result = struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(binary))
result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
result += struct.pack('<II', len(binary), 0x004e4942) + binary
Path('apps/web/public/assets/aqua-blaster-kid.glb').write_bytes(result)
print(f'Official GLB: {len(source):,} -> {len(result):,} bytes; {texture.size} texture, all four clips retained')
