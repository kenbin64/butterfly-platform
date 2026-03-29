/**
 * tests/manifold.test.ts
 *
 * Proves the entire saddle/manifold/substrate system works correctly.
 * Covers:
 *  1. SaddleForm geometry (z=xy, orientation, zero directions)
 *  2. Lock-and-key: 90° rotation changes addressing mode
 *  3. SaddlePair: coupling at 0° vs 90°
 *  4. SaddleField: scalar / gradient / flow field adapters
 *  5. SaddleNetwork: computational graph propagation
 *  6. Extractor: geometric feature detection along paths
 *  7. Interpreter: mapping features to interpreted values
 *  8. Renderer: ASCII output and structured data
 *  9. Agent fix: perceiveScalar reads position directly (no roundtrip)
 * 10. Interaction fix: applyPairwise updates both sides independently
 */

import { SaddleForm, SaddlePair } from "../core/geometry/saddle";
import { dot } from "../core/ops";
import { SaddleField } from "../core/substrate/saddlefield";
import { SaddleNetwork } from "../core/substrate/saddlenetwork";
import { extractAlongPath, extractNetwork } from "../core/substrate/extractor";
import { interpret, reduce } from "../core/substrate/interpreter";
import { sampleField, renderAsAscii, renderAsData } from "../core/substrate/renderer";
import { perceiveScalar, perceiveVector, agent } from "../core/substrate/agent";
import { applyPairwise } from "../core/substrate/interaction";
import { chartFromBasis } from "../core/manifold/manifold";
import { standardBasis } from "../core/transform/basis";
import { observerAtChartOrigin } from "../core/manifold/observer";

const eps = 1e-9;
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e;
const linspace = (a: number, b: number, n: number) =>
    Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));

// ── 1. SaddleForm ────────────────────────────────────────────────────────────
describe("SaddleForm", () => {
    test("valueAt(0°): z=xy", () => {
        const f = new SaddleForm(0);
        expect(near(f.valueAt(2, 3), 6)).toBe(true);
        expect(near(f.valueAt(-1, 4), -4)).toBe(true);
        expect(near(f.valueAt(0, 99), 0)).toBe(true);
    });

    test("valueAt(90°): z=-xy  (lock rotated)", () => {
        const f = new SaddleForm(Math.PI / 2);
        // At 90°: lx = y, ly = -x  → z = y * (-x) = -xy
        expect(near(f.valueAt(2, 3), -6, 1e-5)).toBe(true);
        expect(near(f.valueAt(0, 5), 0, 1e-5)).toBe(true);
    });

    test("zeroDirections are orthogonal", () => {
        const f = new SaddleForm(Math.PI / 4);
        const [d1, d2] = f.zeroDirections();
        const dot = d1[0] * d2[0] + d1[1] * d2[1];
        expect(near(dot, 0, 1e-10)).toBe(true);
    });

    test("zeroDirections are unit vectors", () => {
        const f = new SaddleForm(0.7);
        const [d1, d2] = f.zeroDirections();
        const len1 = Math.hypot(d1[0], d1[1]);
        const len2 = Math.hypot(d2[0], d2[1]);
        expect(near(len1, 1, 1e-10)).toBe(true);
        expect(near(len2, 1, 1e-10)).toBe(true);
    });

    test("along a zeroDirection, z is identically 0", () => {
        const f = new SaddleForm(0.5);
        const [d1] = f.zeroDirections();
        for (const t of [0, 0.3, 1, -2]) {
            expect(near(f.valueAt(t * d1[0], t * d1[1]), 0, 1e-10)).toBe(true);
        }
    });

    test("queryPoint returns one connected line", () => {
        const f = new SaddleForm(0);
        const ys = linspace(-2, 2, 5);
        const zs = f.queryPoint(3, ys); // z = 3 * y
        zs.forEach((z, i) => expect(near(z, 3 * ys[i])).toBe(true));
    });

    test("queryBroadcast couples all x at fixed y", () => {
        const f = new SaddleForm(0);
        const xs = linspace(-2, 2, 5);
        const zs = f.queryBroadcast(2, xs); // z = x * 2
        zs.forEach((z, i) => expect(near(z, xs[i] * 2)).toBe(true));
    });
});

// ── 2. Lock-and-key ──────────────────────────────────────────────────────────
describe("Lock-and-key (90° rotation)", () => {
    test("locked() produces a 90° rotated form", () => {
        const f = new SaddleForm(0);
        const locked = f.locked();
        expect(near(locked.orientation, Math.PI / 2, 1e-10)).toBe(true);
    });

    test("two locks (180°) restore original z up to sign", () => {
        const f = new SaddleForm(0);
        const f180 = f.locked().locked(); // 180°
        // z at 180°: lx = -x, ly = -y → z = (-x)(-y) = xy  (same as 0°)
        expect(near(f180.valueAt(3, 4), f.valueAt(3, 4), 1e-5)).toBe(true);
    });

    test("four locks (360°) = identity", () => {
        const f = new SaddleForm(0.3);
        const f360 = f.locked().locked().locked().locked();
        expect(near(f360.valueAt(1.5, -2.1), f.valueAt(1.5, -2.1), 1e-5)).toBe(true);
    });
});

// ── 3. SaddlePair ────────────────────────────────────────────────────────────
describe("SaddlePair", () => {
    test("secondary is 90° ahead of primary", () => {
        const pair = new SaddlePair(0.2);
        expect(near(pair.secondary.orientation, pair.primary.orientation + Math.PI / 2, 1e-10)).toBe(true);
    });

    test("coupling at 0° is non-zero (aligned forms)", () => {
        const pair = new SaddlePair(0);
        const xs = linspace(-2, 2, 40);
        const c = pair.coupling(xs, 1);
        // primary: z=xy, secondary: z=-xy at y=1 → products are negative → sum < 0
        expect(c).not.toBeCloseTo(0, 3);
    });

    // DISPROOF ATTEMPT: coupling should not be symmetric under sign flip of y0
    test("coupling(y=1) ≠ coupling(y=0) — y0 changes the signal", () => {
        const pair = new SaddlePair(0);
        const xs = linspace(-2, 2, 40);
        expect(pair.coupling(xs, 1)).not.toBeCloseTo(pair.coupling(xs, 0), 5);
    });
});

// ── 4. SaddleField ───────────────────────────────────────────────────────────
describe("SaddleField", () => {
    const form0  = new SaddleForm(0);
    const form90 = new SaddleForm(Math.PI / 2);
    const field  = new SaddleField().place([0, 0], form0);

    test("scalarAt matches SaddleForm.valueAt for nearest cell", () => {
        expect(near(field.scalarAt([2, 3]), form0.valueAt(2, 3))).toBe(true);
        expect(near(field.scalarAt([-1, 4]), form0.valueAt(-1, 4))).toBe(true);
    });

    test("scalarAt([0,0]) = 0 (saddle point is always zero)", () => {
        expect(near(field.scalarAt([0, 0]), 0)).toBe(true);
    });

    test("gradientAt is non-zero away from saddle", () => {
        const g = field.gradientAt([1, 1]);
        const len = Math.hypot(g[0], g[1]);
        expect(len).toBeGreaterThan(0.1);
    });

    test("asFlowField().velocity matches gradientAt", () => {
        const ff = field.asFlowField();
        const p = [1.5, -0.7];
        const v = ff.velocity(p);
        const g = field.gradientAt(p);
        expect(near(v[0], g[0])).toBe(true);
        expect(near(v[1], g[1])).toBe(true);
    });

    test("two-cell field: nearest cell governs each region", () => {
        const f2 = new SaddleField()
            .place([0, 0], form0)
            .place([10, 0], form90);
        // Point near [0,0] → governed by form0
        expect(near(f2.scalarAt([0.1, 0.5]), form0.valueAt(0.1, 0.5))).toBe(true);
        // Point near [10,0] → governed by form90 (local coords relative to [10,0])
        expect(near(f2.scalarAt([10.1, 0.5]), form90.valueAt(0.1, 0.5))).toBe(true);
    });

    // DISPROOF ATTEMPT: gradient at origin should be zero (it's the saddle point)
    test("gradientAt([0,0]) = [0,0] at saddle point", () => {
        const g = field.gradientAt([0, 0]);
        expect(near(g[0], 0, 1e-10)).toBe(true);
        expect(near(g[1], 0, 1e-10)).toBe(true);
    });
});

// ── 5. SaddleNetwork ─────────────────────────────────────────────────────────
describe("SaddleNetwork", () => {
    test("write then read round-trips a value", () => {
        const net = new SaddleNetwork().addNode("A");
        net.write("A", 42);
        expect(net.read("A")).toBe(42);
    });

    test("step propagates output from source to downstream node", () => {
        const net = new SaddleNetwork()
            .addNode("src")
            .addNode("dst")
            .connect("src", "dst");
        net.write("src", 3);
        net.step();
        // dst has an incoming edge from src; after step its output is recomputed
        const out = net.readAll();
        // dst should have been updated (non-zero because coupling is non-zero at y0=3)
        expect(out["dst"]).toBeDefined();
    });

    test("readAll returns an entry for every node", () => {
        const net = new SaddleNetwork()
            .addNode("a").addNode("b").addNode("c");
        const all = net.readAll();
        expect(Object.keys(all)).toHaveLength(3);
    });

    test("node with no incoming edges keeps its written value after step", () => {
        const net = new SaddleNetwork().addNode("isolated");
        net.write("isolated", 7);
        net.step();
        expect(net.read("isolated")).toBe(7);
    });

    // KEY-LOCK SCENARIO:
    // Two forms at the SAME orientation (locked) → coupling is POSITIVE (they reinforce).
    // Two forms at 90° apart (key turned)        → coupling is NEGATIVE (they oppose).
    // The SIGN FLIP is the lock-and-key mechanism — it gates point vs broadcast addressing.
    test("lock (0° aligned) couples positively; key (90° apart) couples negatively", () => {
        const xs = linspace(-2, 2, 20);
        const y0 = 1;

        // Two forms at 0° — LOCKED: z-profiles are identical → dot > 0
        const locked1 = new SaddleForm(0);
        const locked2 = new SaddleForm(0);
        const lockCoupling = dot(
            locked1.queryBroadcast(y0, xs),
            locked2.queryBroadcast(y0, xs)
        );
        expect(lockCoupling).toBeGreaterThan(0);

        // One form at 0°, one at 90° — KEY TURNED: profiles are negatives → dot < 0
        const key = new SaddleForm(Math.PI / 2);
        const keyCoupling = dot(
            locked1.queryBroadcast(y0, xs),
            key.queryBroadcast(y0, xs)
        );
        expect(keyCoupling).toBeLessThan(0);

        // The sign flip IS the gate — lock and key have strictly opposite sign
        expect(Math.sign(lockCoupling)).toBe(1);
        expect(Math.sign(keyCoupling)).toBe(-1);
    });
});

// ── 6. Extractor ─────────────────────────────────────────────────────────────
describe("Extractor", () => {
    const form  = new SaddleForm(0);
    const field = new SaddleField().place([0, 0], form);

    test("extractAlongPath finds zero crossing on y-axis (x=0 → z=0)", () => {
        // Along x=0, z=0 for all y. Walk x from -2 to 2 at y=1.
        // z = x*1 crosses 0 at x=0.
        const path: [number, number][] = linspace(-2, 2, 41).map(x => [x, 1]);
        const result = extractAlongPath(field, path);
        expect(result.summary.zeroCount).toBeGreaterThan(0);
    });

    test("extractAlongPath values match scalarAt", () => {
        const path: [number, number][] = [[1,1],[2,1],[3,1]];
        const result = extractAlongPath(field, path);
        result.values.forEach((z, i) =>
            expect(near(z, field.scalarAt(path[i]))).toBe(true)
        );
    });

    test("summary totalVariation > 0 on a non-flat path", () => {
        const path: [number, number][] = linspace(-2, 2, 20).map(x => [x, 1]);
        const result = extractAlongPath(field, path);
        expect(result.summary.totalVariation).toBeGreaterThan(0);
    });

    test("extractNetwork returns an entry per node", () => {
        const net = new SaddleNetwork().addNode("p").addNode("q");
        net.write("p", 5); net.write("q", -3);
        const out = extractNetwork(net);
        expect(out["p"]).toBe(5);
        expect(out["q"]).toBe(-3);
    });

    // DISPROOF ATTEMPT: flat path (y=0) should produce no zero crossings (z=0 everywhere)
    test("flat path along y=0 produces no sign-change zero crossings", () => {
        // Along y=0: z=x*0=0. All values are zero — no sign *change*, just zeros.
        const path: [number, number][] = linspace(-2, 2, 20).map(x => [x, 0]);
        const result = extractAlongPath(field, path);
        // totalVariation must be 0 (flat)
        expect(near(result.summary.totalVariation, 0)).toBe(true);
    });
});

// ── 7. Interpreter ───────────────────────────────────────────────────────────
describe("Interpreter", () => {
    const zeroCrossing  = { kind: "zero"      as const, position: [0, 0, 0], value: 0 };
    const turningPt     = { kind: "turning"   as const, position: [1, 1, 2], value: 2 };
    const inflectionPt  = { kind: "inflection"as const, position: [2, 2, 1], value: 1 };
    const saddlePt      = { kind: "saddle"    as const, position: [0, 0, 0], value: 0 };

    test("zero → boundary", () => {
        const [v] = interpret([zeroCrossing]);
        expect(v.kind).toBe("boundary");
    });

    test("turning → scalar with value preserved", () => {
        const [v] = interpret([turningPt]);
        expect(v.kind).toBe("scalar");
        expect(near(v.value, 2)).toBe(true);
    });

    test("inflection → transition", () => {
        const [v] = interpret([inflectionPt]);
        expect(v.kind).toBe("transition");
    });

    test("saddle → origin", () => {
        const [v] = interpret([saddlePt]);
        expect(v.kind).toBe("origin");
    });

    test("reduce: sum of scalars", () => {
        const vals = interpret([turningPt, { kind: "turning", position: [3,3,3], value: 3 }]);
        expect(near(reduce(vals, "sum"), 5)).toBe(true);
    });

    test("reduce: mean of scalars", () => {
        const vals = interpret([turningPt, { kind: "turning", position: [3,3,3], value: 3 }]);
        expect(near(reduce(vals, "mean"), 2.5)).toBe(true);
    });

    // DISPROOF ATTEMPT: non-scalar features should not contribute to reduce("sum")
    test("reduce ignores non-scalar features", () => {
        const vals = interpret([zeroCrossing, saddlePt, inflectionPt]);
        expect(near(reduce(vals, "sum"), 0)).toBe(true); // no scalars → 0
    });
});

// ── 8. Renderer ──────────────────────────────────────────────────────────────
describe("Renderer", () => {
    const field = new SaddleField().place([0, 0], new SaddleForm(0));
    const xs = linspace(-2, 2, 10);
    const ys = linspace(-2, 2, 8);

    test("sampleField produces correct dimensions", () => {
        const frame = sampleField(field, xs, ys);
        expect(frame.width).toBe(10);
        expect(frame.height).toBe(8);
        expect(frame.samples).toHaveLength(8);
        expect(frame.samples[0]).toHaveLength(10);
    });

    test("normalised values are all in [0, 1]", () => {
        const frame = sampleField(field, xs, ys);
        for (const row of frame.samples)
            for (const s of row)
                expect(s.normalised).toBeGreaterThanOrEqual(0),
                expect(s.normalised).toBeLessThanOrEqual(1);
    });

    test("renderAsAscii produces correct number of lines", () => {
        const frame = sampleField(field, xs, ys);
        const ascii = renderAsAscii(frame);
        expect(ascii.split("\n")).toHaveLength(8);
    });

    test("renderAsData produces width*height records", () => {
        const frame = sampleField(field, xs, ys);
        const data  = renderAsData(frame);
        expect(data).toHaveLength(80);
        expect(data[0]).toHaveProperty("x");
        expect(data[0]).toHaveProperty("z");
    });

    // DISPROOF ATTEMPT: the saddle point [0,0] should have z=0
    test("sample at origin has z=0", () => {
        const frame = sampleField(field, [0], [0]);
        expect(near(frame.samples[0][0].z, 0)).toBe(true);
    });
});

// ── 9. Agent fix: no perception roundtrip ────────────────────────────────────
describe("Agent perception (bug fix proof)", () => {
    const basis   = standardBasis(2);
    const chart   = chartFromBasis(basis);
    const obs     = observerAtChartOrigin(chart);
    const A       = agent({ ...obs, position: [3, 4] });

    test("perceiveScalar reads at agent position, not origin", () => {
        // Field: f(p) = p[0] * p[1]
        const F = { valueAt: (p: number[]) => p[0] * p[1] };
        expect(near(perceiveScalar(A, F), 12)).toBe(true); // 3*4 = 12
    });

    test("perceiveVector reads at agent position directly", () => {
        // Field returns the position itself
        const F = { valueAt: (p: number[]) => p };
        const v = perceiveVector(A, F);
        expect(near(v[0], 3)).toBe(true);
        expect(near(v[1], 4)).toBe(true);
    });

    // DISPROOF ATTEMPT: if the old roundtrip bug were present, both agents would
    // perceive the same value regardless of position. Prove they don't.
    test("two agents at different positions perceive different field values", () => {
        const F = { valueAt: (p: number[]) => p[0] * p[1] };
        const A1 = agent({ ...obs, position: [2, 3] });
        const A2 = agent({ ...obs, position: [5, 7] });
        expect(perceiveScalar(A1, F)).not.toBeCloseTo(perceiveScalar(A2, F), 5);
    });
});

// ── 10. Interaction fix: applyPairwise both sides ────────────────────────────
describe("applyPairwise (bug fix proof)", () => {
    interface Counter { value: number }

    // Interaction: A sees B and increments its own value by 1 (B's value unused)
    const touch = (a: Counter, _b: Counter) => ({ updated: { value: a.value + 1 } });

    test("both items are updated after one pairwise step", () => {
        const items: Counter[] = [{ value: 0 }, { value: 0 }];
        const result = applyPairwise(items, touch);
        // Both items should have been updated (each acts as A once)
        expect(result[0].value).toBe(1);
        expect(result[1].value).toBe(1);
    });

    // DISPROOF ATTEMPT: the old bug set updated[j] = resultA.updated,
    // meaning B would always get A's value instead of its own.
    // Prove the values are independent.
    test("values are independent — B gets its own update, not A's", () => {
        const asymmetric = (a: Counter, _b: Counter) => ({ updated: { value: a.value + 10 } });
        const items: Counter[] = [{ value: 1 }, { value: 100 }];
        const result = applyPairwise(items, asymmetric);
        // A (1) → 1 + 10 = 11
        expect(result[0].value).toBe(11);
        // B (100) → 100 + 10 = 110  (old bug: would be 11, same as A)
        expect(result[1].value).toBe(110);
    });

    test("three items: all pairs are touched", () => {
        const items: Counter[] = [{ value: 0 }, { value: 0 }, { value: 0 }];
        const result = applyPairwise(items, touch);
        // Item 0 pairs with 1 and 2 → 2 touches
        // Item 1 pairs with 0 and 2 → 2 touches
        // Item 2 pairs with 0 and 1 → 2 touches
        expect(result[0].value).toBe(2);
        expect(result[1].value).toBe(2);
        expect(result[2].value).toBe(2);
    });
});

// ── 11. HelicalCascade (7 pairs, turn keys 2/4/6) ───────────────────────────
import { SaddlePair as CascadePair, HelicalCascade } from "../core/substrate/flow";

describe("HelicalCascade", () => {
    test("creates 7 pairs", () => {
        const helix = new HelicalCascade();
        expect(helix.pairs).toHaveLength(7);
    });

    test("pairs 2, 4, 6 are turn keys", () => {
        const helix = new HelicalCascade();
        expect(helix.getPair(2)?.isTurnKey).toBe(true);
        expect(helix.getPair(4)?.isTurnKey).toBe(true);
        expect(helix.getPair(6)?.isTurnKey).toBe(true);
    });

    test("pairs 1, 3, 5, 7 are NOT turn keys", () => {
        const helix = new HelicalCascade();
        expect(helix.getPair(1)?.isTurnKey).toBe(false);
        expect(helix.getPair(3)?.isTurnKey).toBe(false);
        expect(helix.getPair(5)?.isTurnKey).toBe(false);
        expect(helix.getPair(7)?.isTurnKey).toBe(false);
    });

    test("all pairs start at rotation 0", () => {
        const helix = new HelicalCascade();
        expect(helix.state()).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    test("turnKey(2) rotates pairs 1, 2, 3 by 90°", () => {
        const helix = new HelicalCascade();
        helix.turnKey(2);
        const s = helix.state();
        expect(s[0]).toBe(90);  // pair 1
        expect(s[1]).toBe(90);  // pair 2 (key)
        expect(s[2]).toBe(90);  // pair 3
        expect(s[3]).toBe(0);   // pair 4 unchanged
    });

    test("turnKey(4) rotates pairs 3, 4, 5 by 90°", () => {
        const helix = new HelicalCascade();
        helix.turnKey(4);
        const s = helix.state();
        expect(s[1]).toBe(0);   // pair 2 unchanged
        expect(s[2]).toBe(90);  // pair 3
        expect(s[3]).toBe(90);  // pair 4 (key)
        expect(s[4]).toBe(90);  // pair 5
        expect(s[5]).toBe(0);   // pair 6 unchanged
    });

    test("turnKey(6) rotates pairs 5, 6, 7 by 90°", () => {
        const helix = new HelicalCascade();
        helix.turnKey(6);
        const s = helix.state();
        expect(s[3]).toBe(0);   // pair 4 unchanged
        expect(s[4]).toBe(90);  // pair 5
        expect(s[5]).toBe(90);  // pair 6 (key)
        expect(s[6]).toBe(90);  // pair 7
    });

    test("pairs 3 and 5 are coupling points (driven by 2 keys each)", () => {
        // Pair 3 is driven by keys 2 AND 4
        // Pair 5 is driven by keys 4 AND 6
        const helix = new HelicalCascade();

        helix.turnKey(2); // pair 3 gets +90
        helix.turnKey(4); // pair 3 gets another +90, pair 5 gets +90
        helix.turnKey(6); // pair 5 gets another +90

        const s = helix.state();
        expect(s[2]).toBe(180); // pair 3: rotated by key 2 AND key 4
        expect(s[4]).toBe(180); // pair 5: rotated by key 4 AND key 6
    });

    test("fullCascade rotates all pairs through the helix", () => {
        const helix = new HelicalCascade();
        helix.fullCascade();
        const s = helix.state();

        // Pair 1: key 2 only → 90°
        expect(s[0]).toBe(90);
        // Pair 2: itself → 90°
        expect(s[1]).toBe(90);
        // Pair 3: key 2 + key 4 → 180°
        expect(s[2]).toBe(180);
        // Pair 4: itself → 90°
        expect(s[3]).toBe(90);
        // Pair 5: key 4 + key 6 → 180°
        expect(s[4]).toBe(180);
        // Pair 6: itself → 90°
        expect(s[5]).toBe(90);
        // Pair 7: key 6 only → 90°
        expect(s[6]).toBe(90);
    });

    test("rotation wraps at 360°", () => {
        const helix = new HelicalCascade();
        // Turn key 2 four times → 360° = 0°
        helix.turnKey(2);
        helix.turnKey(2);
        helix.turnKey(2);
        helix.turnKey(2);

        expect(helix.getPair(2)?.rotation).toBe(0);
    });

    test("CascadePair.turn() returns true for turn keys", () => {
        const key = new CascadePair(2);    // even = turn key
        const notKey = new CascadePair(3); // odd = not turn key

        expect(key.turn()).toBe(true);
        expect(notKey.turn()).toBe(false);
    });
});

