import struct
import zlib


def _make_png(width, height, pixels):
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))

    raw = b""
    for y in range(height):
        raw += b"\x00"
        for x in range(width):
            r, g, b = pixels[y][x]
            raw += struct.pack("BBB", r, g, b)

    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return header + ihdr + idat + iend


def make_high_contrast_png():
    w, h = 48, 27
    pixels = []
    for y in range(h):
        row = []
        for x in range(w):
            if 12 <= x <= 36 and 6 <= y <= 21:
                row.append((255, 255, 255))
            else:
                row.append((0, 0, 0))
        pixels.append(row)
    return _make_png(w, h, pixels)


def make_noisy_png():
    w, h = 48, 27
    pixels = []
    seed = 42
    for y in range(h):
        row = []
        for x in range(w):
            seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
            v = seed % 256
            row.append((v, v, v))
        pixels.append(row)
    return _make_png(w, h, pixels)


def make_text_heavy_png():
    w, h = 48, 27
    pixels = []
    for y in range(h):
        row = []
        for x in range(w):
            row.append((200, 200, 200))
        pixels.append(row)
    for y in range(2, 4):
        for x in range(5, 8):
            pixels[y][x] = (0, 0, 0)
    for y in range(2, 4):
        for x in range(10, 13):
            pixels[y][x] = (0, 0, 0)
    for y in range(6, 8):
        for x in range(5, 8):
            pixels[y][x] = (0, 0, 0)
    for y in range(6, 8):
        for x in range(15, 18):
            pixels[y][x] = (0, 0, 0)
    for y in range(10, 12):
        for x in range(20, 23):
            pixels[y][x] = (0, 0, 0)
    return _make_png(w, h, pixels)


def make_blank_png():
    w, h = 48, 27
    pixels = [[(128, 128, 128)] * w for _ in range(h)]
    return _make_png(w, h, pixels)
