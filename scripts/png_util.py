"""Minimal dependency-free PNG reader/writer (8-bit, non-interlaced).

Only what the icon pipeline needs: decode RGBA, tint, alpha-composite,
nearest-neighbour upscale, encode RGBA.
"""
import struct
import zlib


def _paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def _samples(line, n, depth):
    """unpack n MSB-first samples of the given bit depth from a row"""
    if depth == 8:
        return list(line[:n])
    if depth == 16:
        return [line[i * 2] for i in range(n)]
    mask = (1 << depth) - 1
    out = []
    per_byte = 8 // depth
    for i in range(n):
        byte = line[i // per_byte]
        shift = 8 - depth * (i % per_byte + 1)
        out.append((byte >> shift) & mask)
    return out


def decode(path):
    """-> (width, height, bytearray RGBA).  Supports palette/gray 1-16 bit."""
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos = 8
    idat = b''
    palette = None
    trns = None
    trns_color = None
    w = h = depth = ctype = None
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln
        if typ == b'IHDR':
            w, h, depth, ctype, comp, filt, inter = struct.unpack('>IIBBBBB', chunk)
            assert inter == 0, f'unsupported interlace={inter}'
        elif typ == b'PLTE':
            palette = chunk
        elif typ == b'tRNS':
            trns = chunk
        elif typ == b'IDAT':
            idat += chunk
        elif typ == b'IEND':
            break
    raw = zlib.decompress(idat)

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    bits_pp = channels * depth
    stride = (w * bits_pp + 7) // 8
    bpp_bytes = max(1, bits_pp // 8)
    maxval = (1 << depth) - 1
    out = bytearray(w * h * 4)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if f == 1:
            for i in range(bpp_bytes, stride):
                line[i] = (line[i] + line[i - bpp_bytes]) & 0xFF
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif f == 3:
            for i in range(stride):
                a = line[i - bpp_bytes] if i >= bpp_bytes else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp_bytes] if i >= bpp_bytes else 0
                c = prev[i - bpp_bytes] if i >= bpp_bytes else 0
                line[i] = (line[i] + _paeth(a, prev[i], c)) & 0xFF
        elif f != 0:
            raise ValueError(f'bad filter {f}')

        s = _samples(line, w * channels, depth)
        o = y * w * 4
        for x in range(w):
            if ctype == 6:
                r, g, b, a = s[x * 4:x * 4 + 4]
            elif ctype == 2:
                r, g, b = s[x * 3:x * 3 + 3]
                a = 255
            elif ctype == 0:
                v = s[x] * 255 // maxval
                r = g = b = v
                a = 255
            elif ctype == 4:
                v, a = s[x * 2:x * 2 + 2]
                v = v * 255 // maxval
                r = g = b = v
            else:  # palette
                idx = s[x]
                r, g, b = palette[idx * 3:idx * 3 + 3]
                a = trns[idx] if trns and idx < len(trns) else 255
            out[o + x * 4:o + x * 4 + 4] = bytes((r, g, b, a))
        prev = line
    return w, h, out


def encode(path, w, h, rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += rgba[y * w * 4:(y + 1) * w * 4]

    def chunk(typ, payload):
        return (struct.pack('>I', len(payload)) + typ + payload +
                struct.pack('>I', zlib.crc32(typ + payload) & 0xFFFFFFFF))

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) +
           chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def composite(base, overlay, w, h):
    """alpha-composite overlay RGBA over base RGBA"""
    out = bytearray(base)
    for i in range(w * h):
        o = i * 4
        sa = overlay[o + 3]
        if not sa:
            continue
        da = out[o + 3]
        sa_f = sa / 255.0
        da_f = da / 255.0
        oa = sa_f + da_f * (1 - sa_f)
        if oa <= 0:
            continue
        for c in range(3):
            out[o + c] = int(round((overlay[o + c] * sa_f +
                                     out[o + c] * da_f * (1 - sa_f)) / oa))
        out[o + 3] = int(round(oa * 255))
    return out


def tint(rgba, w, h, rgb):
    """multiply RGB by color, keep alpha (matches the game's potion tint)"""
    r, g, b = rgb
    out = bytearray(rgba)
    for i in range(w * h):
        o = i * 4
        if out[o + 3]:
            out[o] = (out[o] * r) // 255
            out[o + 1] = (out[o + 1] * g) // 255
            out[o + 2] = (out[o + 2] * b) // 255
    return out


def upscale(rgba, w, h, factor):
    nw, nh = w * factor, h * factor
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        sy = y // factor
        for x in range(nw):
            sx = x // factor
            s = (sy * w + sx) * 4
            d = (y * nw + x) * 4
            out[d:d + 4] = rgba[s:s + 4]
    return nw, nh, out
