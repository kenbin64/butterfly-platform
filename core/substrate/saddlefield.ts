import { VecN } from "../geometry/vector";
import { SaddleForm } from "../geometry/saddle";
import { ScalarField, VectorField } from "./field";
import { FlowField } from "../manifold/flow";

// A SaddleCell is a SaddleForm placed at a position in the field.
export interface SaddleCell {
    readonly position: [number, number];
    readonly form: SaddleForm;
}

// A SaddleField is a collection of positioned SaddleForms.
// It is the medium through which information flows.
// Any point in the field is governed by the nearest cell.
//
// The field bridges the saddle geometry into the existing
// ScalarField / VectorField / FlowField interfaces so it
// can drive Particles, Signals, Agents and Observers.
export class SaddleField {
    readonly cells: SaddleCell[];

    constructor(cells: SaddleCell[] = []) {
        this.cells = cells;
    }

    /** Number of cells in the field */
    get cellCount(): number {
        return this.cells.length;
    }

    // Add a SaddleForm at a given position. Returns a new SaddleField.
    place(position: [number, number], form: SaddleForm): SaddleField {
        return new SaddleField([...this.cells, { position, form }]);
    }

    // Find the nearest cell to a given point.
    nearest(p: VecN): SaddleCell | null {
        if (this.cells.length === 0) return null;
        let best = this.cells[0];
        let bestDist = dist2(p, best.position);
        for (let i = 1; i < this.cells.length; i++) {
            const d = dist2(p, this.cells[i].position);
            if (d < bestDist) { bestDist = d; best = this.cells[i]; }
        }
        return best;
    }

    // z value at p from the governing (nearest) SaddleForm.
    scalarAt(p: VecN): number {
        const cell = this.nearest(p);
        if (!cell) return 0;
        const lx = p[0] - cell.position[0];
        const ly = p[1] - cell.position[1];
        return cell.form.valueAt(lx, ly);
    }

    // Gradient of z=xy at p: ∂z/∂x = ly·cos - lx·sin, ∂z/∂y = ly·sin + lx·cos
    // (rotated partial derivatives of lx*ly with respect to world x and y)
    gradientAt(p: VecN): VecN {
        const cell = this.nearest(p);
        if (!cell) return [0, 0];
        const c = Math.cos(cell.form.orientation);
        const s = Math.sin(cell.form.orientation);
        const lx =  c * (p[0] - cell.position[0]) + s * (p[1] - cell.position[1]);
        const ly = -s * (p[0] - cell.position[0]) + c * (p[1] - cell.position[1]);
        return [
            c * ly - s * lx,
            s * ly + c * lx,
        ];
    }

    // ScalarField adapter: plugs into Field / Lens / Agent perception.
    asScalarField(): ScalarField {
        return { valueAt: (p: VecN) => this.scalarAt(p) };
    }

    // VectorField adapter: gradient of the saddle surface.
    asVectorField(): VectorField {
        return { valueAt: (p: VecN) => this.gradientAt(p) };
    }

    // FlowField adapter: particles and signals follow the saddle gradient.
    // Information flows uphill along z=xy — toward its saddle ridges.
    asFlowField(): FlowField {
        return { velocity: (p: VecN) => this.gradientAt(p) };
    }
}

const dist2 = (p: VecN, pos: [number, number]): number => {
    const dx = p[0] - pos[0];
    const dy = p[1] - pos[1];
    return dx * dx + dy * dy;
};

