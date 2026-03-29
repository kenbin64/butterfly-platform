"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const manifold_supercharger_1 = require("../core/enhanced/manifold-supercharger");
describe("Enhanced Manifold Supercharger", () => {
    let supercharger;
    beforeEach(() => {
        supercharger = new manifold_supercharger_1.ManifoldSupercharger();
    });
    test("should initialize with default optimization level", () => {
        expect(supercharger.getStats().optimizationLevel).toBe(3);
    });
    test("should create enhanced saddle field with cells", () => {
        const field = supercharger.getEnhancedField();
        expect(field.cellCount).toBeGreaterThan(0);
    });
    test("should optimize level between 1 and 5", () => {
        supercharger.optimizeLevel(1);
        expect(supercharger.getStats().optimizationLevel).toBe(1);
        supercharger.optimizeLevel(5);
        expect(supercharger.getStats().optimizationLevel).toBe(5);
    });
    test("should create enhanced saddle forms with feature awareness", () => {
        const field = supercharger.getEnhancedField();
        const cells = field.cells;
        // Check that enhanced saddles have different orientations
        const orientations = cells.map(cell => cell.form.orientation);
        expect(orientations.some(orientation => orientation !== 0)).toBe(true);
    });
    test("should provide enhanced registry", () => {
        const registry = supercharger.getEnhancedRegistry();
        expect(registry).toBeDefined();
        expect(registry.listStores()).toEqual([]);
    });
    test("should calculate enhanced field values", () => {
        const field = supercharger.getEnhancedField();
        const cell = field.cells[0];
        const position = cell.position;
        const form = cell.form;
        const value = form.valueAt(position[0], position[1]);
        expect(typeof value).toBe("number");
    });
});
