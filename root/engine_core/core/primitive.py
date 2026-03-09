from __future__ import annotations
"""
Practical primitive manifolds (bool, int/uint, float, bits/bytes, char) and pure
substrates for composition: pack/unpack, endian/sign, concat/slice.
All functions are stateless and return values or small tuples; no storage.
"""
from dataclasses import dataclass
from typing import Iterable, Tuple, List, Sequence
import struct as _struct

# Bits are represented as tuples of 0/1 ints
Bits = Tuple[int, ...]


def clamp(v: int, lo: int, hi: int) -> int:
    return lo if v < lo else hi if v > hi else v


# ----- Bits/Bytes basics -----

def int_to_bits(value: int, bits: int, signed: bool = False) -> Bits:
    if signed:
        # two's complement
        mask = (1 << bits) - 1
        value &= mask
    else:
        value = clamp(value, 0, (1 << bits) - 1)
    out = []
    for i in range(bits):
        out.append((value >> (bits - 1 - i)) & 1)
    return tuple(out)


def bits_to_int(b: Bits, signed: bool = False) -> int:
    v = 0
    n = len(b)
    for bit in b:
        v = (v << 1) | (1 if bit else 0)
    if signed and n > 0 and b[0] == 1:
        # negative in two's complement
        v -= (1 << n)
    return v


def concat_bits(parts: Sequence[Bits]) -> Bits:
    return tuple(bit for seg in parts for bit in seg)


def slice_bits(b: Bits, start: int, length: int) -> Bits:
    return tuple(b[start:start+length])


def pack_bits_be(b: Bits) -> bytes:
    # pack to big-endian bit order per byte
    out = bytearray()
    for i in range(0, len(b), 8):
        chunk = b[i:i+8]
        val = 0
        for j, bit in enumerate(chunk):
            val |= (1 if bit else 0) << (7 - j)
        out.append(val)
    return bytes(out)


def unpack_bits_be(data: bytes, total_bits: int | None = None) -> Bits:
    bits: List[int] = []
    for byte in data:
        for j in range(8):
            bits.append((byte >> (7 - j)) & 1)
    if total_bits is not None:
        bits = bits[:total_bits]
    return tuple(bits)


def endian_swap_words(data: bytes, word_size: int) -> bytes:
    out = bytearray()
    for i in range(0, len(data), word_size):
        out.extend(reversed(data[i:i+word_size]))
    return bytes(out)


# ----- Integers and floats to bytes -----

FMT_MAP = {
    ('u8', None): 'B', ('i8', None): 'b',
    ('u16', 'le'): '<H', ('u16', 'be'): '>H', ('i16', 'le'): '<h', ('i16', 'be'): '>h',
    ('u32', 'le'): '<I', ('u32', 'be'): '>I', ('i32', 'le'): '<i', ('i32', 'be'): '>i',
    ('u64', 'le'): '<Q', ('u64', 'be'): '>Q', ('i64', 'le'): '<q', ('i64', 'be'): '>q',
    ('f32', 'le'): '<f', ('f32', 'be'): '>f', ('f64', 'le'): '<d', ('f64', 'be'): '>d',
}


def int_to_bytes(value: int, width: int, signed: bool, endian: str | None) -> bytes:
    key = (("i" if signed else "u") + str(width), 'le' if endian == 'le' else 'be' if endian == 'be' else None)
    fmt = FMT_MAP.get(key)
    if not fmt:
        raise ValueError('unsupported width/endian')
    return _struct.pack(fmt, int(value))


def bytes_to_int(data: bytes, width: int, signed: bool, endian: str | None) -> int:
    key = (("i" if signed else "u") + str(width), 'le' if endian == 'le' else 'be' if endian == 'be' else None)
    fmt = FMT_MAP.get(key)
    if not fmt:
        raise ValueError('unsupported width/endian')
    return int(_struct.unpack(fmt, data)[0])


def float_to_bytes(value: float, fmt: str = 'f32', endian: str = 'le') -> bytes:
    key = (fmt, 'le' if endian == 'le' else 'be')
    s = FMT_MAP.get(key)
    if not s:
        raise ValueError('unsupported float format')
    return _struct.pack(s, float(value))


def bytes_to_float(data: bytes, fmt: str = 'f32', endian: str = 'le') -> float:
    key = (fmt, 'le' if endian == 'le' else 'be')
    s = FMT_MAP.get(key)
    if not s:
        raise ValueError('unsupported float format')
    return float(_struct.unpack(s, data)[0])


# ----- Structured composition -----

@dataclass(frozen=True)
class FieldSpec:
    name: str
    kind: str  # 'u32','i16','f32','bits:n','bytes:n' etc.
    endian: str | None = None  # 'le'|'be' or None for 8-bit
    bits: int | None = None  # for bits kind


def pack_struct(specs: Sequence[FieldSpec], values: dict) -> bytes:
    parts: List[bytes] = []
    bit_accum: List[int] = []
    for fs in specs:
        v = values[fs.name]
        if fs.kind.startswith('bits'):
            n = fs.bits if fs.bits is not None else int(fs.kind.split(':')[1])
            b = int_to_bits(int(v), n, signed=False)
            bit_accum.extend(list(b))
            # flush bits to bytes on byte boundary
            if len(bit_accum) % 8 == 0:
                parts.append(pack_bits_be(tuple(bit_accum)))
                bit_accum.clear()
        elif fs.kind in ('u8','i8','u16','i16','u32','i32','u64','i64'):
            signed = fs.kind.startswith('i')
            width = int(fs.kind[1:])
            parts.append(int_to_bytes(int(v), width, signed, fs.endian))
        elif fs.kind in ('f32','f64'):
            parts.append(float_to_bytes(float(v), fmt=fs.kind, endian=fs.endian or 'le'))
        elif fs.kind.startswith('bytes'):
            parts.append(bytes(v))
        else:
            raise ValueError('unsupported kind')
    if bit_accum:
        parts.append(pack_bits_be(tuple(bit_accum)))
    return b''.join(parts)


def unpack_struct(specs: Sequence[FieldSpec], data: bytes) -> dict:
    out: dict = {}
    idx = 0
    bit_buf: Bits = tuple()
    for fs in specs:
        if fs.kind.startswith('bits'):
            n = fs.bits if fs.bits is not None else int(fs.kind.split(':')[1])
            need = n - len(bit_buf)
            if need > 0:
                # top up from bytes
                take = (need + 7)//8
                bit_buf = concat_bits([bit_buf, unpack_bits_be(data[idx:idx+take], take*8)])
                idx += take
            seg = slice_bits(bit_buf, 0, n)
            bit_buf = slice_bits(bit_buf, n, len(bit_buf)-n)
            out[fs.name] = bits_to_int(seg, signed=False)
        elif fs.kind in ('u8','i8','u16','i16','u32','i32','u64','i64'):
            width = int(fs.kind[1:])
            size = width//8
            chunk = data[idx:idx+size]
            idx += size
            signed = fs.kind.startswith('i')
            out[fs.name] = bytes_to_int(chunk, width, signed, fs.endian)
        elif fs.kind in ('f32','f64'):
            size = 4 if fs.kind=='f32' else 8
            chunk = data[idx:idx+size]
            idx += size
            out[fs.name] = bytes_to_float(chunk, fmt=fs.kind, endian=fs.endian or 'le')
        elif fs.kind.startswith('bytes'):
            n = int(fs.kind.split(':')[1])
            out[fs.name] = data[idx:idx+n]
            idx += n
        else:
            raise ValueError('unsupported kind')
    return out
