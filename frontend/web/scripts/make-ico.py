import struct

with open('frontend/web/public/favicon-16x16.png', 'rb') as f: png16 = f.read()
with open('frontend/web/public/favicon-32x32.png', 'rb') as f: png32 = f.read()
with open('frontend/web/public/favicon-48x48.png', 'rb') as f: png48 = f.read()

entries = [(16, png16), (32, png32), (48, png48)]

header = struct.pack('<HHH', 0, 1, len(entries))  # reserved, type=icon, count
odir_offset = 6 + 16 * len(entries)
data_offset = odir_offset
blobs = []
for size, blob in entries:
    blobs.append(blob)

out = [header]
offset = odir_offset
for (size, blob), i in zip(entries, range(len(entries))):
    w = size if size < 256 else 0
    out.append(struct.pack('<BBBBHHII', w, w, 0, 0, 1, 32, len(blob), offset))
    offset += len(blob)
out.append(b''.join(blobs))
with open('frontend/web/public/favicon.ico', 'wb') as f:
    f.write(b''.join(out))
print('wrote favicon.ico', 6 + 16*len(entries) + sum(len(b) for _, b in entries), 'bytes')
