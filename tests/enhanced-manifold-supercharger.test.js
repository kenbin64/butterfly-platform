"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Use Jest globals — do NOT require("node:test")
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
