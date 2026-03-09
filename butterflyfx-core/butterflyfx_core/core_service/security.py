from __future__ import annotations
import time
import json
import hashlib
from typing import Optional, Tuple

import ed25519  # type: ignore


class ReceiptSigner:
    def __init__(self, seed_hex: str):
        seed = bytes.fromhex(seed_hex) if all(c in '0123456789abcdef' for c in seed_hex.lower()) and len(seed_hex) >= 32 else hashlib.sha256(seed_hex.encode()).digest()
        self.sk = ed25519.SigningKey(seed[:32])
        self.vk = self.sk.get_verifying_key()
        self._last_root = None

    @property
    def public_key_hex(self) -> str:
        return self.vk.to_ascii(encoding="hex").decode()

    def digest_payload(self, payload: dict) -> str:
        data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(data).hexdigest()

    def sign_receipt(self, payload: dict) -> dict:
        now = int(time.time() * 1000)
        digest = self.digest_payload(payload)
        # Merkle-like chaining: root = H(prev_root || digest)
        if self._last_root is None:
            root_material = bytes.fromhex(digest)
        else:
            root_material = bytes.fromhex(self._last_root) + bytes.fromhex(digest)
        merkle_root = hashlib.sha256(root_material).hexdigest()
        sig = self.sk.sign(bytes.fromhex(merkle_root)).hex()
        self._last_root = merkle_root
        return {
            "ts_ms": now,
            "digest": digest,
            "merkle_root": merkle_root,
            "sig": sig,
            "pub": self.public_key_hex,
        }
