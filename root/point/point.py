# point.py
# ButterflyFX – Point Kernel
# The singularity, the seed, the origin of all dimensional unfolding.

import os
import sys
import time
import uuid
from dataclasses import dataclass

# Ensure the root directory (one level up from this file) is on sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from manifold.d1.dimension import Dimension1


@dataclass(frozen=True)
class PointIdentity:
    seed: str
    created_at: float


class Point:
    def __init__(self):
        # Deterministic identity for this universe instance
        self.identity = PointIdentity(
            seed=str(uuid.uuid4()),
            created_at=time.time()
        )

        # Registry of dimensions: name -> callable object with run()
        self.dimensions = {}

    def register_dimension(self, name: str, dimension_obj):
        """Bind a dimension object to the point kernel."""
        self.dimensions[name] = dimension_obj

    def unfold(self):
        """Trigger unfolding of all registered dimensions in order."""
        print("[POINT] Unfolding universe...")
        for name, dim in self.dimensions.items():
            print(f"[POINT] → Unfolding dimension: {name}")
            dim.run()

    def info(self):
        return {
            "seed": self.identity.seed,
            "created_at": self.identity.created_at,
            "dimensions": list(self.dimensions.keys()),
        }


def main():
    print("[POINT] Kernel initializing...")
    point = Point()

    # Register Dimension 1 (Rule Layer)
    d1 = Dimension1()
    point.register_dimension("d1", d1)

    print("[POINT] Kernel initialized.")
    print("[POINT] Identity:", point.info())

    # Begin unfolding
    point.unfold()


if __name__ == "__main__":
    main()