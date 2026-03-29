"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaddleField = void 0;
// A SaddleField is a collection of positioned SaddleForms.
// It is the medium through which information flows.
// Any point in the field is governed by the nearest cell.
//
// The field bridges the saddle geometry into the existing
// ScalarField / VectorField / FlowField interfaces so it
// can drive Particles, Signals, Agents and Observers.
class SaddleField {
    constructor(cells = []) {
        this.cells = cells;
    }
    /** Number of cells in the field */
    get cellCount() {
        return this.cells.length;
    }
    // Add a SaddleForm at a given position. Returns a new SaddleField.
    place(position, form) {
        return new SaddleField([...this.cells, { position, form }]);
    }
    // Find the nearest cell to a given point.
    nearest(p) {
        if (this.cells.length === 0)
            return null;
        let best = this.cells[0];
        let bestDist = dist2(p, best.position);
        for (let i = 1; i < this.cells.length; i++) {
            const d = dist2(p, this.cells[i].position);
            if (d < bestDist) {
                bestDist = d;
                best = this.cells[i];
            }
        }
        return best;
    }
    // z value at p from the governing (nearest) SaddleForm.
    scalarAt(p) {
        const cell = this.nearest(p);
        if (!cell)
            return 0;
        const lx = p[0] - cell.position[0];
        const ly = p[1] - cell.position[1];
        return cell.form.valueAt(lx, ly);
    }
    // Gradient of z=xy at p: ∂z/∂x = ly·cos - lx·sin, ∂z/∂y = ly·sin + lx·cos
    // (rotated partial derivatives of lx*ly with respect to world x and y)
    gradientAt(p) {
        const cell = this.nearest(p);
        if (!cell)
            return [0, 0];
        const c = Math.cos(cell.form.orientation);
        const s = Math.sin(cell.form.orientation);
        const lx = c * (p[0] - cell.position[0]) + s * (p[1] - cell.position[1]);
        const ly = -s * (p[0] - cell.position[0]) + c * (p[1] - cell.position[1]);
        return [
            c * ly - s * lx,
            s * ly + c * lx,
        ];
    }
    // ScalarField adapter: plugs into Field / Lens / Agent perception.
    asScalarField() {
        return { valueAt: (p) => this.scalarAt(p) };
    }
    // VectorField adapter: gradient of the saddle surface.
    asVectorField() {
        return { valueAt: (p) => this.gradientAt(p) };
    }
    // FlowField adapter: particles and signals follow the saddle gradient.
    // Information flows uphill along z=xy — toward its saddle ridges.
    asFlowField() {
        return { velocity: (p) => this.gradientAt(p) };
    }
}
exports.SaddleField = SaddleField;
const dist2 = (p, pos) => {
    const dx = p[0] - pos[0];
    const dy = p[1] - pos[1];
    return dx * dx + dy * dy;
};
