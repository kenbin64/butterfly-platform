"""
Prompt parsing to parameter manifolds (very lightweight placeholder keeping system storage-free).
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any


@dataclass(frozen=True)
class CameraParams:
    fov_y: float | None = None
    dolly_speed: float | None = None
    zoom_speed: float | None = None


@dataclass(frozen=True)
class ColorGrade:
    exposure: float = 1.0


@dataclass(frozen=True)
class PromptParams:
    camera: CameraParams
    color_grade: ColorGrade


def to_parameters(prompt: str) -> PromptParams:
    p = prompt.lower()
    cam = CameraParams(
        fov_y=35.0 if "cinematic" in p else 60.0 if "wide" in p else None,
        dolly_speed=0.1 if "dolly" in p else None,
        zoom_speed=0.1 if "zoom" in p else None,
    )
    grade = ColorGrade(exposure=1.2 if "golden hour" in p else 1.0)
    return PromptParams(camera=cam, color_grade=grade)
