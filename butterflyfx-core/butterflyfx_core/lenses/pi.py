from __future__ import annotations
# BBP formula for hexadecimal digits of pi starting at position n (0-indexed)
# Returns a string of hex digits.

import math

def _series(j: int, n: int) -> float:
    s = 0.0
    for k in range(n + 1):
        r = 8 * k + j
        s = (s + pow(16, n - k, r) / r) % 1.0
    t = 0.0
    k = n + 1
    while True:
        r = 8 * k + j
        new = t + (16 ** (n - k)) / r
        if new == t:
            break
        t = new
        k += 1
    return (s + t) % 1.0


def bbp_hex_digits(start: int, count: int) -> str:
    # Generate count hex digits of pi starting at index 'start'
    digits = []
    for n in range(start, start + count):
        y = (4 * _series(1, n) - 2 * _series(4, n) - _series(5, n) - _series(6, n))
        y = y % 1.0
        d = int(16.0 * y)
        digits.append("0123456789ABCDEF"[d])
    return "".join(digits)
