"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const primitive_substrate_1 = require("../core/substrate/primitive-substrate");
describe("Primitive Substrates — Manifold-Native Primitive Types", () => {
    // ─── NumberSubstrate ────────────────────────────────────────────────────────
    describe("NumberSubstrate", () => {
        test("should construct with initial value and round-trip through manifold", () => {
            const n = new primitive_substrate_1.NumberSubstrate(42);
            expect(n.value).toBeCloseTo(42, 5);
        });
        test("should default to 0", () => {
            const n = new primitive_substrate_1.NumberSubstrate();
            expect(n.value).toBeCloseTo(0, 5);
        });
        test("should update value via setter and re-discover path", () => {
            const n = new primitive_substrate_1.NumberSubstrate(10);
            n.value = 99;
            expect(n.value).toBeCloseTo(99, 5);
        });
        test("should expose a PathExpr with section, angle, radius, depth", () => {
            const n = new primitive_substrate_1.NumberSubstrate(25);
            const p = n.pathExpr;
            expect(p).toHaveProperty("section");
            expect(p).toHaveProperty("angle");
            expect(p).toHaveProperty("radius");
            expect(p).toHaveProperty("depth");
        });
        test("add returns a new NumberSubstrate with summed value", () => {
            const a = new primitive_substrate_1.NumberSubstrate(10);
            const b = new primitive_substrate_1.NumberSubstrate(5);
            const c = a.add(b);
            expect(c.value).toBeCloseTo(15, 5);
            // original unchanged
            expect(a.value).toBeCloseTo(10, 5);
        });
        test("add accepts raw number", () => {
            const a = new primitive_substrate_1.NumberSubstrate(7);
            expect(a.add(3).value).toBeCloseTo(10, 5);
        });
        test("subtract returns difference", () => {
            expect(new primitive_substrate_1.NumberSubstrate(20).subtract(8).value).toBeCloseTo(12, 5);
        });
        test("multiply returns product", () => {
            expect(new primitive_substrate_1.NumberSubstrate(6).multiply(7).value).toBeCloseTo(42, 5);
        });
        test("divide returns quotient", () => {
            expect(new primitive_substrate_1.NumberSubstrate(100).divide(4).value).toBeCloseTo(25, 5);
        });
        test("divide by zero throws", () => {
            expect(() => new primitive_substrate_1.NumberSubstrate(1).divide(0)).toThrow("Division by zero");
        });
        test("negative values round-trip", () => {
            const n = new primitive_substrate_1.NumberSubstrate(-17);
            expect(n.value).toBeCloseTo(-17, 5);
        });
        test("reset sets value to 0", () => {
            const n = new primitive_substrate_1.NumberSubstrate(999);
            n.reset();
            expect(n.value).toBeCloseTo(0, 5);
        });
        test("serialize / hydrate round-trip", () => {
            const n = new primitive_substrate_1.NumberSubstrate(77);
            const state = n.serialize();
            const n2 = new primitive_substrate_1.NumberSubstrate();
            n2.hydrate(state);
            expect(n2.value).toBeCloseTo(77, 5);
        });
        test("drill('value') reflects current number", () => {
            const n = new primitive_substrate_1.NumberSubstrate(33);
            expect(n.drill("value").value).toBeCloseTo(33, 5);
        });
        test("chained arithmetic produces correct result", () => {
            // (10 + 5) * 3 - 2 = 43
            const result = new primitive_substrate_1.NumberSubstrate(10).add(5).multiply(3).subtract(2);
            expect(result.value).toBeCloseTo(43, 5);
        });
        test("large values round-trip", () => {
            const n = new primitive_substrate_1.NumberSubstrate(1000000);
            expect(n.value).toBeCloseTo(1000000, 0);
        });
        test("fractional values round-trip", () => {
            const n = new primitive_substrate_1.NumberSubstrate(3.14159);
            expect(n.value).toBeCloseTo(3.14159, 3);
        });
    });
    // ─── StringSubstrate ────────────────────────────────────────────────────────
    describe("StringSubstrate", () => {
        test("should construct with initial string and round-trip through manifold", () => {
            const s = new primitive_substrate_1.StringSubstrate("hello");
            expect(s.value).toBe("hello");
        });
        test("should default to empty string", () => {
            const s = new primitive_substrate_1.StringSubstrate();
            expect(s.value).toBe("");
            expect(s.length).toBe(0);
        });
        test("should update value via setter", () => {
            const s = new primitive_substrate_1.StringSubstrate("abc");
            s.value = "xyz";
            expect(s.value).toBe("xyz");
        });
        test("length matches character count", () => {
            const s = new primitive_substrate_1.StringSubstrate("manifold");
            expect(s.length).toBe(8);
        });
        test("charAt returns correct character", () => {
            const s = new primitive_substrate_1.StringSubstrate("abcdef");
            expect(s.charAt(0)).toBe("a");
            expect(s.charAt(3)).toBe("d");
            expect(s.charAt(5)).toBe("f");
        });
        test("charAt out of bounds returns empty string", () => {
            const s = new primitive_substrate_1.StringSubstrate("hi");
            expect(s.charAt(-1)).toBe("");
            expect(s.charAt(99)).toBe("");
        });
        test("concat returns new StringSubstrate", () => {
            const a = new primitive_substrate_1.StringSubstrate("hello");
            const b = new primitive_substrate_1.StringSubstrate(" world");
            const c = a.concat(b);
            expect(c.value).toBe("hello world");
            // originals unchanged
            expect(a.value).toBe("hello");
        });
        test("concat accepts raw string", () => {
            const s = new primitive_substrate_1.StringSubstrate("foo");
            expect(s.concat("bar").value).toBe("foobar");
        });
        test("slice returns substring as new StringSubstrate", () => {
            const s = new primitive_substrate_1.StringSubstrate("manifold");
            const sliced = s.slice(0, 4);
            expect(sliced.value).toBe("mani");
            expect(sliced.length).toBe(4);
        });
        test("slice with only start", () => {
            const s = new primitive_substrate_1.StringSubstrate("abcdef");
            expect(s.slice(3).value).toBe("def");
        });
        test("includes returns true for present substring", () => {
            const s = new primitive_substrate_1.StringSubstrate("the manifold is geometry");
            expect(s.includes("manifold")).toBe(true);
            expect(s.includes("missing")).toBe(false);
        });
        test("each character has its own path expression", () => {
            const s = new primitive_substrate_1.StringSubstrate("abc");
            expect(s.pathExprs.length).toBe(3);
            // Each path has section, angle, radius, depth
            for (const p of s.pathExprs) {
                expect(p).toHaveProperty("section");
                expect(p).toHaveProperty("radius");
            }
        });
        test("reset clears to empty string", () => {
            const s = new primitive_substrate_1.StringSubstrate("data");
            s.reset();
            expect(s.value).toBe("");
            expect(s.length).toBe(0);
        });
        test("serialize / hydrate round-trip", () => {
            const s = new primitive_substrate_1.StringSubstrate("round-trip");
            const state = s.serialize();
            const s2 = new primitive_substrate_1.StringSubstrate();
            s2.hydrate(state);
            expect(s2.value).toBe("round-trip");
        });
        test("drill('value') reflects current string", () => {
            const s = new primitive_substrate_1.StringSubstrate("test");
            expect(s.drill("value").value).toBe("test");
        });
        test("drill('length') reflects current length", () => {
            const s = new primitive_substrate_1.StringSubstrate("five!");
            expect(s.drill("length").value).toBe(5);
        });
        test("numeric string round-trips correctly", () => {
            const s = new primitive_substrate_1.StringSubstrate("12345");
            expect(s.value).toBe("12345");
        });
        test("special characters round-trip", () => {
            const s = new primitive_substrate_1.StringSubstrate("z=x·y");
            expect(s.value).toBe("z=x·y");
        });
    });
    // ─── BooleanSubstrate ───────────────────────────────────────────────────────
    describe("BooleanSubstrate", () => {
        test("should construct with true and round-trip", () => {
            const b = new primitive_substrate_1.BooleanSubstrate(true);
            expect(b.value).toBe(true);
        });
        test("should construct with false and round-trip", () => {
            const b = new primitive_substrate_1.BooleanSubstrate(false);
            expect(b.value).toBe(false);
        });
        test("should default to false", () => {
            const b = new primitive_substrate_1.BooleanSubstrate();
            expect(b.value).toBe(false);
        });
        test("should update value via setter", () => {
            const b = new primitive_substrate_1.BooleanSubstrate(false);
            b.value = true;
            expect(b.value).toBe(true);
            b.value = false;
            expect(b.value).toBe(false);
        });
        test("true maps to section 1 (Point), false to section 0 (Void)", () => {
            const t = new primitive_substrate_1.BooleanSubstrate(true);
            expect(t.pathExpr.section).toBe(1);
            const f = new primitive_substrate_1.BooleanSubstrate(false);
            expect(f.pathExpr.section).toBe(0);
        });
        test("NOT inverts the value", () => {
            expect(new primitive_substrate_1.BooleanSubstrate(true).not().value).toBe(false);
            expect(new primitive_substrate_1.BooleanSubstrate(false).not().value).toBe(true);
        });
        test("AND truth table", () => {
            const T = new primitive_substrate_1.BooleanSubstrate(true);
            const F = new primitive_substrate_1.BooleanSubstrate(false);
            expect(T.and(T).value).toBe(true);
            expect(T.and(F).value).toBe(false);
            expect(F.and(T).value).toBe(false);
            expect(F.and(F).value).toBe(false);
        });
        test("OR truth table", () => {
            const T = new primitive_substrate_1.BooleanSubstrate(true);
            const F = new primitive_substrate_1.BooleanSubstrate(false);
            expect(T.or(T).value).toBe(true);
            expect(T.or(F).value).toBe(true);
            expect(F.or(T).value).toBe(true);
            expect(F.or(F).value).toBe(false);
        });
        test("XOR truth table", () => {
            const T = new primitive_substrate_1.BooleanSubstrate(true);
            const F = new primitive_substrate_1.BooleanSubstrate(false);
            expect(T.xor(T).value).toBe(false);
            expect(T.xor(F).value).toBe(true);
            expect(F.xor(T).value).toBe(true);
            expect(F.xor(F).value).toBe(false);
        });
        test("AND/OR/XOR accept raw booleans", () => {
            const t = new primitive_substrate_1.BooleanSubstrate(true);
            expect(t.and(false).value).toBe(false);
            expect(t.or(false).value).toBe(true);
            expect(t.xor(true).value).toBe(false);
        });
        test("reset sets to false", () => {
            const b = new primitive_substrate_1.BooleanSubstrate(true);
            b.reset();
            expect(b.value).toBe(false);
        });
        test("serialize / hydrate round-trip", () => {
            const b = new primitive_substrate_1.BooleanSubstrate(true);
            const state = b.serialize();
            const b2 = new primitive_substrate_1.BooleanSubstrate();
            b2.hydrate(state);
            expect(b2.value).toBe(true);
        });
        test("drill('value') reflects current boolean", () => {
            const b = new primitive_substrate_1.BooleanSubstrate(true);
            expect(b.drill("value").value).toBe(true);
        });
        test("drill('section') reflects helix section", () => {
            const t = new primitive_substrate_1.BooleanSubstrate(true);
            expect(t.drill("section").value).toBe(1);
            const f = new primitive_substrate_1.BooleanSubstrate(false);
            expect(f.drill("section").value).toBe(0);
        });
    });
    // ─── Cross-Substrate ───────────────────────────────────────────────────────
    describe("Cross-Substrate Interactions", () => {
        test("NumberSubstrate arithmetic with values from StringSubstrate length", () => {
            const s = new primitive_substrate_1.StringSubstrate("hello");
            const n = new primitive_substrate_1.NumberSubstrate(s.length);
            expect(n.value).toBeCloseTo(5, 5);
            expect(n.multiply(10).value).toBeCloseTo(50, 5);
        });
        test("BooleanSubstrate from NumberSubstrate comparison", () => {
            const a = new primitive_substrate_1.NumberSubstrate(10);
            const b = new primitive_substrate_1.NumberSubstrate(5);
            const isGreater = new primitive_substrate_1.BooleanSubstrate(a.value > b.value);
            expect(isGreater.value).toBe(true);
        });
        test("all three substrates are independent manifold residents", () => {
            const n = new primitive_substrate_1.NumberSubstrate(42);
            const s = new primitive_substrate_1.StringSubstrate("42");
            const b = new primitive_substrate_1.BooleanSubstrate(true);
            // Each has its own path — no cross-contamination
            expect(n.pathExpr).not.toEqual(s.pathExprs[0]);
            expect(n.value).toBeCloseTo(42, 5);
            expect(s.value).toBe("42");
            expect(b.value).toBe(true);
        });
    });
});
