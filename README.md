# ButterflyFX Core Repository

This repository has been narrowed to the ButterflyFX pieces you said to keep:

- `butterflyfx-core/` — secure Core service
- `butterflyfx_kernel/` — kernel package and formal docs
- `butterflyfx-ip/` — IP and reference materials

## What ButterflyFX is

ButterflyFX is aimed at **storage-free computing for application data**.

The system stores the **generative basis** of computation:

- source code
- kernel
- core service
- manifold definitions
- substrate rules
- policies and provenance

What it does **not** treat as canonical truth is ordinary application data. That data is intended to be **derived on demand** from stored structure rather than persisted as redundant state.

## Repository structure

- `butterflyfx-core/`
  - Core API service
  - receipt and provenance handling
  - benchmark runner and scenarios
  - deployment docs
- `butterflyfx_kernel/`
  - helix kernel implementation
  - kernel tests
  - formal specification, white paper, and security docs
- `butterflyfx-ip/`
  - copyright and proof/reference artifacts

## Verification assets

Primary retained verification material lives in:

- `butterflyfx_kernel/tests/`
- `butterflyfx-core/butterflyfx_core/benchmarks/`
- `butterflyfx-core/docs/BENCHMARKS.md`

## Cleanup goal

This repo is being prepared as a smaller, clearer Core/Kernel/IP codebase that can be documented, tested, benchmarked, and sent to GitHub cleanly.