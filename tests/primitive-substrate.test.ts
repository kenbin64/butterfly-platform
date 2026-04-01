import {
  NumberSubstrate,
  StringSubstrate,
  BooleanSubstrate,
} from "../core/substrate/primitive-substrate";

describe("Primitive Substrates — Manifold-Native Primitive Types", () => {

  // ─── NumberSubstrate ────────────────────────────────────────────────────────

  describe("NumberSubstrate", () => {
    test("should construct with initial value and round-trip through manifold", () => {
      const n = new NumberSubstrate(42);
      expect(n.value).toBeCloseTo(42, 5);
    });

    test("should default to 0", () => {
      const n = new NumberSubstrate();
      expect(n.value).toBeCloseTo(0, 5);
    });

    test("should update value via setter and re-discover path", () => {
      const n = new NumberSubstrate(10);
      n.value = 99;
      expect(n.value).toBeCloseTo(99, 5);
    });

    test("should expose a PathExpr with section, angle, radius, depth", () => {
      const n = new NumberSubstrate(25);
      const p = n.pathExpr;
      expect(p).toHaveProperty("section");
      expect(p).toHaveProperty("angle");
      expect(p).toHaveProperty("radius");
      expect(p).toHaveProperty("depth");
    });

    test("add returns a new NumberSubstrate with summed value", () => {
      const a = new NumberSubstrate(10);
      const b = new NumberSubstrate(5);
      const c = a.add(b);
      expect(c.value).toBeCloseTo(15, 5);
      // original unchanged
      expect(a.value).toBeCloseTo(10, 5);
    });

    test("add accepts raw number", () => {
      const a = new NumberSubstrate(7);
      expect(a.add(3).value).toBeCloseTo(10, 5);
    });

    test("subtract returns difference", () => {
      expect(new NumberSubstrate(20).subtract(8).value).toBeCloseTo(12, 5);
    });

    test("multiply returns product", () => {
      expect(new NumberSubstrate(6).multiply(7).value).toBeCloseTo(42, 5);
    });

    test("divide returns quotient", () => {
      expect(new NumberSubstrate(100).divide(4).value).toBeCloseTo(25, 5);
    });

    test("divide by zero throws", () => {
      expect(() => new NumberSubstrate(1).divide(0)).toThrow("Division by zero");
    });

    test("negative values round-trip", () => {
      const n = new NumberSubstrate(-17);
      expect(n.value).toBeCloseTo(-17, 5);
    });

    test("reset sets value to 0", () => {
      const n = new NumberSubstrate(999);
      n.reset();
      expect(n.value).toBeCloseTo(0, 5);
    });

    test("serialize / hydrate round-trip", () => {
      const n = new NumberSubstrate(77);
      const state = n.serialize();
      const n2 = new NumberSubstrate();
      n2.hydrate(state);
      expect(n2.value).toBeCloseTo(77, 5);
    });

    test("drill('value') reflects current number", () => {
      const n = new NumberSubstrate(33);
      expect(n.drill("value").value).toBeCloseTo(33, 5);
    });

    test("chained arithmetic produces correct result", () => {
      // (10 + 5) * 3 - 2 = 43
      const result = new NumberSubstrate(10).add(5).multiply(3).subtract(2);
      expect(result.value).toBeCloseTo(43, 5);
    });

    test("large values round-trip", () => {
      const n = new NumberSubstrate(1_000_000);
      expect(n.value).toBeCloseTo(1_000_000, 0);
    });

    test("fractional values round-trip", () => {
      const n = new NumberSubstrate(3.14159);
      expect(n.value).toBeCloseTo(3.14159, 3);
    });
  });

  // ─── StringSubstrate ────────────────────────────────────────────────────────

  describe("StringSubstrate", () => {
    test("should construct with initial string and round-trip through manifold", () => {
      const s = new StringSubstrate("hello");
      expect(s.value).toBe("hello");
    });

    test("should default to empty string", () => {
      const s = new StringSubstrate();
      expect(s.value).toBe("");
      expect(s.length).toBe(0);
    });

    test("should update value via setter", () => {
      const s = new StringSubstrate("abc");
      s.value = "xyz";
      expect(s.value).toBe("xyz");
    });

    test("length matches character count", () => {
      const s = new StringSubstrate("manifold");
      expect(s.length).toBe(8);
    });

    test("charAt returns correct character", () => {
      const s = new StringSubstrate("abcdef");
      expect(s.charAt(0)).toBe("a");
      expect(s.charAt(3)).toBe("d");
      expect(s.charAt(5)).toBe("f");
    });

    test("charAt out of bounds returns empty string", () => {
      const s = new StringSubstrate("hi");
      expect(s.charAt(-1)).toBe("");
      expect(s.charAt(99)).toBe("");
    });

    test("concat returns new StringSubstrate", () => {
      const a = new StringSubstrate("hello");
      const b = new StringSubstrate(" world");
      const c = a.concat(b);
      expect(c.value).toBe("hello world");
      // originals unchanged
      expect(a.value).toBe("hello");
    });

    test("concat accepts raw string", () => {
      const s = new StringSubstrate("foo");
      expect(s.concat("bar").value).toBe("foobar");
    });

    test("slice returns substring as new StringSubstrate", () => {
      const s = new StringSubstrate("manifold");
      const sliced = s.slice(0, 4);
      expect(sliced.value).toBe("mani");
      expect(sliced.length).toBe(4);
    });

    test("slice with only start", () => {
      const s = new StringSubstrate("abcdef");
      expect(s.slice(3).value).toBe("def");
    });

    test("includes returns true for present substring", () => {
      const s = new StringSubstrate("the manifold is geometry");
      expect(s.includes("manifold")).toBe(true);
      expect(s.includes("missing")).toBe(false);
    });

    test("each character has its own path expression", () => {
      const s = new StringSubstrate("abc");
      expect(s.pathExprs.length).toBe(3);
      // Each path has section, angle, radius, depth
      for (const p of s.pathExprs) {
        expect(p).toHaveProperty("section");
        expect(p).toHaveProperty("radius");
      }
    });

    test("reset clears to empty string", () => {
      const s = new StringSubstrate("data");
      s.reset();
      expect(s.value).toBe("");
      expect(s.length).toBe(0);
    });

    test("serialize / hydrate round-trip", () => {
      const s = new StringSubstrate("round-trip");
      const state = s.serialize();
      const s2 = new StringSubstrate();
      s2.hydrate(state);
      expect(s2.value).toBe("round-trip");
    });

    test("drill('value') reflects current string", () => {
      const s = new StringSubstrate("test");
      expect(s.drill("value").value).toBe("test");
    });

    test("drill('length') reflects current length", () => {
      const s = new StringSubstrate("five!");
      expect(s.drill("length").value).toBe(5);
    });

    test("numeric string round-trips correctly", () => {
      const s = new StringSubstrate("12345");
      expect(s.value).toBe("12345");
    });

    test("special characters round-trip", () => {
      const s = new StringSubstrate("z=x·y");
      expect(s.value).toBe("z=x·y");
    });
  });

  // ─── BooleanSubstrate ───────────────────────────────────────────────────────

  describe("BooleanSubstrate", () => {
    test("should construct with true and round-trip", () => {
      const b = new BooleanSubstrate(true);
      expect(b.value).toBe(true);
    });

    test("should construct with false and round-trip", () => {
      const b = new BooleanSubstrate(false);
      expect(b.value).toBe(false);
    });

    test("should default to false", () => {
      const b = new BooleanSubstrate();
      expect(b.value).toBe(false);
    });

    test("should update value via setter", () => {
      const b = new BooleanSubstrate(false);
      b.value = true;
      expect(b.value).toBe(true);
      b.value = false;
      expect(b.value).toBe(false);
    });

    test("true maps to section 1 (Point), false to section 0 (Void)", () => {
      const t = new BooleanSubstrate(true);
      expect(t.pathExpr.section).toBe(1);
      const f = new BooleanSubstrate(false);
      expect(f.pathExpr.section).toBe(0);
    });

    test("NOT inverts the value", () => {
      expect(new BooleanSubstrate(true).not().value).toBe(false);
      expect(new BooleanSubstrate(false).not().value).toBe(true);
    });

    test("AND truth table", () => {
      const T = new BooleanSubstrate(true);
      const F = new BooleanSubstrate(false);
      expect(T.and(T).value).toBe(true);
      expect(T.and(F).value).toBe(false);
      expect(F.and(T).value).toBe(false);
      expect(F.and(F).value).toBe(false);
    });

    test("OR truth table", () => {
      const T = new BooleanSubstrate(true);
      const F = new BooleanSubstrate(false);
      expect(T.or(T).value).toBe(true);
      expect(T.or(F).value).toBe(true);
      expect(F.or(T).value).toBe(true);
      expect(F.or(F).value).toBe(false);
    });

    test("XOR truth table", () => {
      const T = new BooleanSubstrate(true);
      const F = new BooleanSubstrate(false);
      expect(T.xor(T).value).toBe(false);
      expect(T.xor(F).value).toBe(true);
      expect(F.xor(T).value).toBe(true);
      expect(F.xor(F).value).toBe(false);
    });

    test("AND/OR/XOR accept raw booleans", () => {
      const t = new BooleanSubstrate(true);
      expect(t.and(false).value).toBe(false);
      expect(t.or(false).value).toBe(true);
      expect(t.xor(true).value).toBe(false);
    });

    test("reset sets to false", () => {
      const b = new BooleanSubstrate(true);
      b.reset();
      expect(b.value).toBe(false);
    });

    test("serialize / hydrate round-trip", () => {
      const b = new BooleanSubstrate(true);
      const state = b.serialize();
      const b2 = new BooleanSubstrate();
      b2.hydrate(state);
      expect(b2.value).toBe(true);
    });

    test("drill('value') reflects current boolean", () => {
      const b = new BooleanSubstrate(true);
      expect(b.drill("value").value).toBe(true);
    });

    test("drill('section') reflects helix section", () => {
      const t = new BooleanSubstrate(true);
      expect(t.drill("section").value).toBe(1);
      const f = new BooleanSubstrate(false);
      expect(f.drill("section").value).toBe(0);
    });
  });

  // ─── Cross-Substrate ───────────────────────────────────────────────────────

  describe("Cross-Substrate Interactions", () => {
    test("NumberSubstrate arithmetic with values from StringSubstrate length", () => {
      const s = new StringSubstrate("hello");
      const n = new NumberSubstrate(s.length);
      expect(n.value).toBeCloseTo(5, 5);
      expect(n.multiply(10).value).toBeCloseTo(50, 5);
    });

    test("BooleanSubstrate from NumberSubstrate comparison", () => {
      const a = new NumberSubstrate(10);
      const b = new NumberSubstrate(5);
      const isGreater = new BooleanSubstrate(a.value > b.value);
      expect(isGreater.value).toBe(true);
    });

    test("all three substrates are independent manifold residents", () => {
      const n = new NumberSubstrate(42);
      const s = new StringSubstrate("42");
      const b = new BooleanSubstrate(true);
      // Each has its own path — no cross-contamination
      expect(n.pathExpr).not.toEqual(s.pathExprs[0]);
      expect(n.value).toBeCloseTo(42, 5);
      expect(s.value).toBe("42");
      expect(b.value).toBe(true);
    });
  });
});

// ================================================================
//  DIMENSIONAL SUBSTRATE TESTS
// ================================================================

import {
  PointSubstrate,
  LinearSubstrate,
  PlanarSubstrate,
  VolumeSubstrate,
  ObjectSubstrate,
} from "../core/substrate/dimensional-substrate";
import { SubstrateDimension } from "../core/substrate/substrate-interface";

describe("Dimensional Substrates — Engine Building Blocks", () => {

  // ─── 0D: PointSubstrate ─────────────────────────────────────────────────────

  describe("PointSubstrate (0D)", () => {
    test("dimension is Point (0)", () => {
      const p = new PointSubstrate("test-point");
      expect(p.dimension).toBe(SubstrateDimension.Point);
    });

    test("defaults to value 0", () => {
      const p = new PointSubstrate("zero");
      expect(p.value).toBeCloseTo(0, 5);
    });

    test("constructs with initial value and round-trips", () => {
      const p = new PointSubstrate("pi", 3.14159);
      expect(p.value).toBeCloseTo(3.14159, 3);
    });

    test("evaluate() returns same as value", () => {
      const p = new PointSubstrate("e", 2.71828);
      expect(p.evaluate()).toBeCloseTo(p.value, 10);
    });

    test("setPath/getPath round-trip", () => {
      const p = new PointSubstrate("x");
      p.setPath("value", 42);
      expect(p.getPath("value")).toBeCloseTo(42, 5);
    });

    test("getPathExpr returns a PathExpr with section/angle/radius/depth", () => {
      const p = new PointSubstrate("coord", 100);
      const expr = p.getPathExpr("value");
      expect(expr).toHaveProperty("section");
      expect(expr).toHaveProperty("angle");
      expect(expr).toHaveProperty("radius");
      expect(expr).toHaveProperty("depth");
    });

    test("pathKeys lists all keys", () => {
      const p = new PointSubstrate("k", 5);
      expect(p.pathKeys()).toContain("value");
    });

    test("negative values round-trip", () => {
      const p = new PointSubstrate("neg", -99);
      expect(p.value).toBeCloseTo(-99, 3);
    });

    test("reset clears to 0", () => {
      const p = new PointSubstrate("r", 1000);
      p.reset();
      expect(p.value).toBeCloseTo(0, 5);
    });

    test("serialize/hydrate round-trip", () => {
      const p1 = new PointSubstrate("s", 77);
      const state = p1.serialize();
      const p2 = new PointSubstrate("s2");
      p2.hydrate(state);
      expect(p2.value).toBeCloseTo(77, 3);
    });

    test("delta cache: same path object returns cached z", () => {
      const p = new PointSubstrate("cached", 42);
      // Evaluate twice — second should hit cache (same ref)
      const v1 = p.value;
      const v2 = p.value;
      expect(v1).toBe(v2);
    });
  });

  // ─── 1D: LinearSubstrate ────────────────────────────────────────────────────

  describe("LinearSubstrate (1D)", () => {
    test("dimension is Linear (1)", () => {
      const l = new LinearSubstrate("test-linear");
      expect(l.dimension).toBe(SubstrateDimension.Linear);
    });

    test("constructs with values and reports correct count", () => {
      const l = new LinearSubstrate("wave", [10, 20, 30, 40]);
      expect(l.count).toBe(4);
    });

    test("evaluateAt returns correct values", () => {
      const l = new LinearSubstrate("data", [100, 200, 300]);
      expect(l.evaluateAt(0)).toBeCloseTo(100, 3);
      expect(l.evaluateAt(1)).toBeCloseTo(200, 3);
      expect(l.evaluateAt(2)).toBeCloseTo(300, 3);
    });

    test("evaluateAt out of bounds returns 0", () => {
      const l = new LinearSubstrate("short", [5]);
      expect(l.evaluateAt(-1)).toBe(0);
      expect(l.evaluateAt(99)).toBe(0);
    });

    test("addPoint extends the set", () => {
      const l = new LinearSubstrate("grow");
      expect(l.count).toBe(0);
      l.addPoint(42);
      l.addPoint(84);
      expect(l.count).toBe(2);
      expect(l.evaluateAt(0)).toBeCloseTo(42, 3);
      expect(l.evaluateAt(1)).toBeCloseTo(84, 3);
    });

    test("points property exposes readonly path expressions", () => {
      const l = new LinearSubstrate("pts", [1, 2, 3]);
      expect(l.points.length).toBe(3);
      for (const p of l.points) {
        expect(p).toHaveProperty("section");
        expect(p).toHaveProperty("radius");
      }
    });

    test("serialize/hydrate round-trip", () => {
      const l1 = new LinearSubstrate("s", [10, 20, 30]);
      const state = l1.serialize();
      const l2 = new LinearSubstrate("s2");
      l2.hydrate(state);
      expect(l2.count).toBe(3);
      expect(l2.evaluateAt(1)).toBeCloseTo(20, 3);
    });

    test("reset clears all points", () => {
      const l = new LinearSubstrate("r", [1, 2, 3]);
      l.reset();
      expect(l.count).toBe(0);
    });
  });

  // ─── 2D: PlanarSubstrate ────────────────────────────────────────────────────

  describe("PlanarSubstrate (2D)", () => {
    test("dimension is Planar (2)", () => {
      const p = new PlanarSubstrate("test-plane");
      expect(p.dimension).toBe(SubstrateDimension.Planar);
    });

    test("constructs with row data and evaluates correctly", () => {
      const p = new PlanarSubstrate("grid", [
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(p.linears.length).toBe(2);
      expect(p.evaluateAt(0, 0)).toBeCloseTo(1, 3);
      expect(p.evaluateAt(0, 2)).toBeCloseTo(3, 3);
      expect(p.evaluateAt(1, 1)).toBeCloseTo(5, 3);
    });

    test("evaluateAt out of bounds returns 0", () => {
      const p = new PlanarSubstrate("small", [[10]]);
      expect(p.evaluateAt(-1, 0)).toBe(0);
      expect(p.evaluateAt(99, 0)).toBe(0);
    });

    test("addLinear extends the plane", () => {
      const p = new PlanarSubstrate("grow");
      p.addLinear([7, 8, 9]);
      expect(p.linears.length).toBe(1);
      expect(p.evaluateAt(0, 1)).toBeCloseTo(8, 3);
    });

    test("serialize/hydrate round-trip", () => {
      const p1 = new PlanarSubstrate("s", [[10, 20], [30, 40]]);
      const state = p1.serialize();
      const p2 = new PlanarSubstrate("s2");
      p2.hydrate(state);
      expect(p2.linears.length).toBe(2);
      expect(p2.evaluateAt(1, 0)).toBeCloseTo(30, 3);
    });

    test("reset clears all linears", () => {
      const p = new PlanarSubstrate("r", [[1, 2], [3, 4]]);
      p.reset();
      expect(p.linears.length).toBe(0);
    });
  });

  // ─── 3D: VolumeSubstrate ──────────────────────────────────────────────────

  describe("VolumeSubstrate (3D)", () => {
    test("dimension is Volume (3)", () => {
      const v = new VolumeSubstrate("test-vol");
      expect(v.dimension).toBe(SubstrateDimension.Volume);
    });

    test("constructs with plane data and evaluates correctly", () => {
      const v = new VolumeSubstrate("cube", [
        [[1, 2], [3, 4]],   // plane 0
        [[5, 6], [7, 8]],   // plane 1
      ]);
      expect(v.planes.length).toBe(2);
      expect(v.evaluateAt(0, 0, 0)).toBeCloseTo(1, 3);
      expect(v.evaluateAt(0, 1, 1)).toBeCloseTo(4, 3);
      expect(v.evaluateAt(1, 0, 1)).toBeCloseTo(6, 3);
      expect(v.evaluateAt(1, 1, 0)).toBeCloseTo(7, 3);
    });

    test("evaluateAt out of bounds returns 0", () => {
      const v = new VolumeSubstrate("tiny", [[[1]]]);
      expect(v.evaluateAt(-1, 0, 0)).toBe(0);
      expect(v.evaluateAt(99, 0, 0)).toBe(0);
    });

    test("addPlane extends the volume", () => {
      const v = new VolumeSubstrate("grow");
      v.addPlane([[10, 20]]);
      expect(v.planes.length).toBe(1);
      expect(v.evaluateAt(0, 0, 0)).toBeCloseTo(10, 3);
    });

    test("serialize/hydrate round-trip", () => {
      const v1 = new VolumeSubstrate("s", [[[50, 60]], [[70, 80]]]);
      const state = v1.serialize();
      const v2 = new VolumeSubstrate("s2");
      v2.hydrate(state);
      expect(v2.planes.length).toBe(2);
      expect(v2.evaluateAt(1, 0, 1)).toBeCloseTo(80, 3);
    });

    test("reset clears all planes", () => {
      const v = new VolumeSubstrate("r", [[[1]], [[2]]]);
      v.reset();
      expect(v.planes.length).toBe(0);
    });
  });

  // ─── Whole: ObjectSubstrate ───────────────────────────────────────────────

  describe("ObjectSubstrate (Whole)", () => {
    test("dimension is Whole (4)", () => {
      const vol = new VolumeSubstrate("v", [[[1]]]);
      const obj = new ObjectSubstrate("test-obj", vol);
      expect(obj.dimension).toBe(SubstrateDimension.Whole);
    });

    test("collapses volume to a single z", () => {
      const vol = new VolumeSubstrate("v", [[[10, 20], [30, 40]]]);
      const obj = new ObjectSubstrate("collapsed", vol);
      // z should be discoverable and non-zero (sum of all values)
      expect(typeof obj.z).toBe("number");
      expect(obj.z).not.toBe(0);
    });

    test("volume property returns the underlying volume", () => {
      const vol = new VolumeSubstrate("v", [[[5]]]);
      const obj = new ObjectSubstrate("o", vol);
      expect(obj.volume).toBe(vol);
    });

    test("collapse() recomputes z after volume mutation", () => {
      const vol = new VolumeSubstrate("v", [[[1]]]);
      const obj = new ObjectSubstrate("o", vol);
      const z1 = obj.z;
      vol.addPlane([[100, 200]]);
      obj.collapse();
      const z2 = obj.z;
      expect(z2).not.toBeCloseTo(z1, 3);
    });

    test("serialize/hydrate round-trip", () => {
      const vol = new VolumeSubstrate("v", [[[42]]]);
      const obj1 = new ObjectSubstrate("o", vol);
      const state = obj1.serialize();
      const vol2 = new VolumeSubstrate("v2");
      const obj2 = new ObjectSubstrate("o2", vol2);
      obj2.hydrate(state);
      expect(obj2.z).toBeCloseTo(obj1.z, 5);
    });

    test("reset clears volume and z", () => {
      const vol = new VolumeSubstrate("v", [[[99]]]);
      const obj = new ObjectSubstrate("o", vol);
      obj.reset();
      expect(obj.z).toBeCloseTo(0, 5);
      expect(obj.volume.planes.length).toBe(0);
    });
  });

  // ─── Cross-Dimensional ────────────────────────────────────────────────────

  describe("Cross-Dimensional (N is point in N+1)", () => {
    test("point is element of linear", () => {
      const point = new PointSubstrate("p", 42);
      const linear = new LinearSubstrate("l", [point.value, 84]);
      expect(linear.evaluateAt(0)).toBeCloseTo(point.value, 3);
    });

    test("linear is element of planar", () => {
      const linear = new LinearSubstrate("l", [1, 2, 3]);
      const planar = new PlanarSubstrate("p", [
        [1, 2, 3],  // same data as linear
        [4, 5, 6],
      ]);
      // Row 0 should match the linear
      for (let i = 0; i < linear.count; i++) {
        expect(planar.evaluateAt(0, i)).toBeCloseTo(linear.evaluateAt(i), 3);
      }
    });

    test("full hierarchy: Point → Linear → Planar → Volume → Object", () => {
      const vol = new VolumeSubstrate("world", [
        [[1, 2], [3, 4]],
        [[5, 6], [7, 8]],
      ]);
      const obj = new ObjectSubstrate("entity", vol);

      // Object has a z (collapsed volume)
      expect(typeof obj.z).toBe("number");
      // Volume has planes
      expect(vol.planes.length).toBe(2);
      // Each plane has linears
      expect(vol.planes[0].linears.length).toBe(2);
      // Each linear has points
      expect(vol.planes[0].linears[0].count).toBe(2);
      // All values are discoverable via z-invocation
      expect(vol.evaluateAt(1, 1, 1)).toBeCloseTo(8, 3);
    });
  });
});
