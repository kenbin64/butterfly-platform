from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class State(BaseModel):
    spiral: int = Field(...)
    level: int = Field(..., ge=0, le=6)


class Capability(BaseModel):
    # Dev mode: value "allow" permits operations. Production will replace with signed tokens.
    token: Optional[str] = None


class CoreRequest(BaseModel):
    state: State
    k: Optional[int] = None
    capability: Optional[str] = None


class CoreResponse(BaseModel):
    state: State
    receipt: dict


class PiRequest(BaseModel):
    start: int = 0
    count: int = 64
    capability: Optional[str] = None


class PiResponse(BaseModel):
    hex_digits: str
    lens_manifest_hash: str
    receipt: dict


class PrimesRequest(BaseModel):
    start: int = 2
    count: int = 100
    rounds: int = 8
    capability: Optional[str] = None


class PrimeResult(BaseModel):
    n: int
    probable_prime: bool
    witnesses: List[int]


class PrimesResponse(BaseModel):
    results: List[PrimeResult]
    lens_manifest_hash: str
    receipt: dict


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    core_hash: str
    kernel_hash: str
