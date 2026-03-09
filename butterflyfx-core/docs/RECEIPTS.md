# Receipts and Verification

Every accepted Core call emits a signed receipt to prove provenance and integrity without storing payloads.

## Receipt contents
```
{
  "ts_ms": 1710112345678,
  "digest": "<sha256 over canonicalized payload>",
  "merkle_root": "<sha256(prev_root || digest)>",
  "sig": "<Ed25519 signature over merkle_root>",
  "pub": "<public-key-hex>"
}
```

Payload used for digest includes:
- op (e.g., INVOKE, SPIRAL_UP, DERIVE_PI)
- prev/next state digests (for transitions)
- args (k, start, count, rounds, etc.)
- out_digest (sha256 of derived value representation)
- code_hashes (core files + kernel file if available)

## Verifying receipts
1) Recompute the digest over the payload (ensure canonical JSON: sorted keys).
2) Recompute or validate the Merkle root chaining.
3) Verify Ed25519 signature using `pub`.

## Tools
- Use Python `ed25519` and `hashlib` as in `butterflyfx_core/core_service/security.py`.
- Compare `/health` code hashes with those embedded in receipts.

Receipts are privacy-preserving and auditable. They are suitable for public posting or timestamp anchoring.
