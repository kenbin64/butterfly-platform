import { VecN } from "./vector";
import { dot } from "../ops";

// The fundamental geometric form: z = xy.
// Information is stored in the shape — zero crossings, turning points,
// inflections along any path traced on the surface.
//
// Orientation rotates the saddle around z:
//   0°  → z =  xy  (one fixed x connects to ONE point on a partner surface)
//   90° → z = -xy  (one fixed y connects to EVERY x on a partner surface)
//
// Two SaddleForms at 90° = one complete helical unit = full 360° coupling.

export type FeatureKind = "zero" | "turning" | "inflection" | "saddle";

export interface GeometricFeature {
    readonly kind: FeatureKind;
    readonly position: VecN; // [x, y, z]
    readonly value: number;  // z at this point
}

export class SaddleForm {
    readonly orientation: number; // radians around z-axis

    constructor(orientation: number = 0) {
        this.orientation = orientation;
    }

    // Evaluate z at world-space (x, y) given this saddle's orientation.
    // Rotates (x,y) into saddle-local coordinates, then applies z = lx * ly.
    valueAt(x: number, y: number): number {
        const c = Math.cos(this.orientation);
        const s = Math.sin(this.orientation);
        const lx =  c * x + s * y;
        const ly = -s * x + c * y;
        return lx * ly;
    }

    // The two directions along which z = 0 (the saddle's zero axes).
    // These rotate with the saddle and are the fundamental address lines.
    zeroDirections(): [VecN, VecN] {
        const c = Math.cos(this.orientation);
        const s = Math.sin(this.orientation);
        return [
            [-s, c], // lx = 0 axis
            [ c, s], // ly = 0 axis
        ];
    }

    // Point query: fix x = x0, sample z along y.
    // One x position → one linear connection. Single address.
    queryPoint(x0: number, ys: number[]): number[] {
        return ys.map(y => this.valueAt(x0, y));
    }

    // Broadcast query: fix y = y0, sample z along x.
    // Every x is coupled simultaneously. Full broadcast.
    queryBroadcast(y0: number, xs: number[]): number[] {
        return xs.map(x => this.valueAt(x, y0));
    }

    // Extract geometric features along a path of (x, y) samples.
    // These features — turnings, inflections, zero crossings — carry information.
    featuresAlongPath(path: [number, number][]): GeometricFeature[] {
        if (path.length < 3) return [];

        const zs = path.map(([x, y]) => this.valueAt(x, y));
        const features: GeometricFeature[] = [];

        for (let i = 1; i < path.length - 1; i++) {
            const [x, y] = path[i];
            const z = zs[i];

            // Zero crossing: z changes sign between i-1 and i.
            if ((zs[i - 1] < 0 && z >= 0) || (zs[i - 1] > 0 && z <= 0)) {
                features.push({ kind: "zero", position: [x, y, z], value: z });
            }

            // Turning point: slope reverses (local extremum of z along path).
            const slopeBefore = z - zs[i - 1];
            const slopeAfter  = zs[i + 1] - z;
            if ((slopeBefore > 0 && slopeAfter < 0) || (slopeBefore < 0 && slopeAfter > 0)) {
                features.push({ kind: "turning", position: [x, y, z], value: z });
            }

            // Inflection: curvature (second difference) changes sign.
            if (i >= 2) {
                const d2Prev = zs[i]     - 2 * zs[i - 1] + zs[i - 2];
                const d2Curr = zs[i + 1] - 2 * zs[i]     + zs[i - 1];
                if ((d2Prev > 0 && d2Curr < 0) || (d2Prev < 0 && d2Curr > 0)) {
                    features.push({ kind: "inflection", position: [x, y, z], value: z });
                }
            }
        }

        return features;
    }

    // Return this saddle rotated by the given angle.
    rotated(angle: number): SaddleForm {
        return new SaddleForm(this.orientation + angle);
    }

    // The lock-and-key transform: rotate 90°.
    // Switches between point-addressing and broadcast-addressing.
    locked(): SaddleForm {
        return this.rotated(Math.PI / 2);
    }
}

// Two SaddleForms at 90° — the minimal complete unit.
// Primary + secondary together cover the full 360° helical structure.
// connectPoint:     one x on primary ↔ one x on secondary  (point lock)
// connectBroadcast: every x on primary ↔ every x on secondary (open key)
export class SaddlePair {
    readonly primary: SaddleForm;
    readonly secondary: SaddleForm;

    constructor(orientation: number = 0) {
        this.primary   = new SaddleForm(orientation);
        this.secondary = new SaddleForm(orientation + Math.PI / 2);
    }

    connectPoint(x0: number, ys: number[]): { primary: number[]; secondary: number[] } {
        return {
            primary:   this.primary.queryPoint(x0, ys),
            secondary: this.secondary.queryPoint(x0, ys),
        };
    }

    connectBroadcast(y0: number, xs: number[]): { primary: number[]; secondary: number[] } {
        return {
            primary:   this.primary.queryBroadcast(y0, xs),
            secondary: this.secondary.queryBroadcast(y0, xs),
        };
    }

    // How strongly primary and secondary are coupled along a shared axis.
    // Dot product of their z-profiles: high = aligned, zero = orthogonal.
    coupling(xs: number[], y0: number): number {
        const p = this.primary.queryBroadcast(y0, xs);
        const q = this.secondary.queryBroadcast(y0, xs);
        return dot(p, q);
    }
}

