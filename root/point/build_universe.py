import os
import argparse
from pathlib import Path

# ---------------------------------------------------------
#  ButterflyFX Universe Builder
#  Root of Roots: Point‑Manifold
#  First Act: Divide the Waters (substrate ↔ manifold)
#  Optional Act: Unfold Dimensions (Fibonacci/Genesis order)
# ---------------------------------------------------------

# Dimensional sequence (Fibonacci/Genesis aligned)
DIMENSIONS = [
    "point",
    "line",
    "plane",
    "volume",
    "object",
    "motion",
    "context",      # replaces “awareness”
    "expression",
    "source"
]

# ---------------------------------------------------------
#  Create a folder if it doesn't exist
# ---------------------------------------------------------
def ensure(path: Path):
    if not path.exists():
        path.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------
#  First Creation: Point‑Manifold
# ---------------------------------------------------------
def create_point_manifold(root: Path):
    point = root / "point"
    substrate = point / "substrate"
    manifold = point / "manifold"

    ensure(point)
    ensure(substrate)
    ensure(manifold)

    # Create placeholder rule files
    (substrate / "seed_rule.py").write_text("# Seed rule placeholder\n")
    (substrate / "observer_rule.py").write_text("# Observer rule placeholder\n")
    (substrate / "perception_rule.py").write_text("# Perception rule placeholder\n")
    (substrate / "manifestation_rule.py").write_text("# Manifestation rule placeholder\n")
    (substrate / "continuity_rule.py").write_text("# Continuity rule placeholder\n")
    (substrate / "identity_rule.py").write_text("# Identity rule placeholder\n")

    print("Created Point‑Manifold with substrate and manifold.")

# ---------------------------------------------------------
#  Unfold the dimensional manifold
# ---------------------------------------------------------
def unfold_dimensions(root: Path):
    manifold_root = root / "point" / "manifold"

    for dim in DIMENSIONS:
        dim_path = manifold_root / dim
        ensure(dim_path)

        # Each dimension gets a placeholder rule file
        rule_file = dim_path / f"{dim}_rules.py"
        if not rule_file.exists():
            rule_file.write_text(f"# Rules for {dim} dimension\n")

    print("Unfolded all dimensions (Fibonacci/Genesis sequence).")

# ---------------------------------------------------------
#  Main entry point
# ---------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="ButterflyFX Universe Builder")
    parser.add_argument("--unfold", action="store_true", help="Unfold all dimensions")
    args = parser.parse_args()

    # Root of roots
    root = Path(__file__).resolve().parent

    # First creation: Point‑Manifold
    create_point_manifold(root)

    # Optional: unfold the universe
    if args.unfold:
        unfold_dimensions(root)

if __name__ == "__main__":
    main()