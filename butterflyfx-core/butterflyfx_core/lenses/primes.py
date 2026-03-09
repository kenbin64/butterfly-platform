from __future__ import annotations
import random


def _powmod(a: int, d: int, n: int) -> int:
    return pow(a, d, n)


def miller_rabin(n: int, rounds: int = 8, seed: int = 12345) -> tuple[bool, list[int]]:
    if n < 2:
        return False, []
    small_primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    if n in small_primes:
        return True, []
    if any(n % p == 0 for p in small_primes):
        return False, []

    # write n-1 as 2^s * d
    d = n - 1
    s = 0
    while d % 2 == 0:
        d //= 2
        s += 1

    rnd = random.Random(seed ^ n)
    witnesses_used: list[int] = []

    for _ in range(rounds):
        a = rnd.randrange(2, n - 1)
        witnesses_used.append(a)
        x = _powmod(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(s - 1):
            x = (x * x) % n
            if x == n - 1:
                break
        else:
            return False, witnesses_used
    return True, witnesses_used


def scan_primes(start: int, count: int, rounds: int = 8) -> list[tuple[int, bool, list[int]]]:
    out = []
    n = max(2, start)
    for i in range(count):
        is_prob, wit = miller_rabin(n + i, rounds=rounds)
        out.append((n + i, is_prob, wit))
    return out
