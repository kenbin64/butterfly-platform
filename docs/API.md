# Manifold API Reference

## Overview

The Manifold system provides three main components:

1. **Dimensional Programming** - Direct drilling into data without tree traversal
2. **Substrate Factory** - Middleware for building computational substrates
3. **Core Manifold** - Saddle surface geometry and helical cascade mechanics

---

## 1. Dimensional Programming

### Philosophy

In Dimensional Programming, **objects are dimensions** and **parts are points**. Instead of traversing a tree structure to reach nested data, you "drill" directly to any depth with O(1) per-level overhead.

```
Traditional:  object.property.subproperty  →  Requires tree traversal
Dimensional:  object.drill("property", "subproperty")  →  Direct drilling
```

### Paradigm Rules

| Rule | Why |
|------|-----|
| **NEVER iterate a dimension** | Dimensions are infinite - only finite sets can iterate |
| **Single object = O(1)** | Drill directly to the point - the address IS the lookup |
| **Multiple elements = Recursion** | Drill through patterns, not loops |
| **Pattern matching = Regex** | Regex describes addresses, not search algorithms |
| **Manifold IS the index** | No external indexes needed |

### Core API

#### `Dimension<T>`

The fundamental unit. Every Dimension is both a value AND a container of lower dimensions.

```typescript
import { dim, Dimension, dimFrom } from "./core/dimensional";

// Create a dimension
const d = dim<number>(42);
console.log(d.value);  // 42

// Create nested structure
const root = dim<Record<string, unknown>>({});
root.drill("users", "alice", "age").value = 30;
```

**Properties:**
- `value: T` - Get/set the value at this dimension
- `version: DimensionVersion` - Version info (id, timestamp, parent)
- `path: string[]` - Path from root to this dimension
- `rank: number` - Number of child parts

**Methods:**
- `at<U>(key: string): Dimension<U>` - Access or create a child dimension
- `drill<U>(...keys: string[]): Dimension<U>` - Multi-level direct access - **O(1) per level**
- `drillPath<U>(keys: readonly string[]): Dimension<U>` - Array-based drilling (faster)
- `withValue<U>(newValue: U): Dimension<U>` - Create new version with different value (immutable)
- `observe(fn: DimensionObserver<T>): () => void` - Watch for changes
- `invoke(): T` - Get value and trigger observers
- `keys(): string[]` - List discrete keys at this level
- `has(key: string): boolean` - Check if discrete point exists
- `match(pattern: RegExp): Dimension[]` - Find matching keys at this level (regex)
- `search(patterns: RegExp[]): Dimension[]` - Recursive regex drill through multiple levels
- `find(patterns: RegExp[]): Dimension | undefined` - First match with regex path

#### `dimFrom<T>(obj: T)`

Convert a JavaScript object into a Dimension hierarchy:

```typescript
const user = { name: "Alice", settings: { theme: "dark" } };
const d = dimFrom(user);
console.log(d.drill("settings", "theme").value);  // "dark"
```

#### Regex-Based Access

Regex is your friend for pattern-based addressing:

```typescript
// Setup: users with various IDs
root.drill("users", "user_123", "email").value = "a@example.com";
root.drill("users", "user_456", "email").value = "b@example.com";
root.drill("users", "admin_1", "email").value = "admin@example.com";

// Match at one level - find all user_* keys
const users = root.drill("users").match(/^user_/);
// Returns: [Dimension(user_123), Dimension(user_456)]

// Recursive search - drill through pattern path
const emails = root.search([/^users$/, /^user_/, /^email$/]);
// Returns all email dimensions for user_* entries

// Find first match
const firstUser = root.find([/^users$/, /^user_/]);
```

#### `Address` (Symbolic Paths)

```typescript
import { address } from "./core/dimensional";

const addr = address("users", "alice", "profile");
const profile = addr.resolve<UserProfile>(root);
```

---

## 2. Substrate Factory

The middleware layer between your code and the core manifold system.

### Three Ways to Create Substrates

#### 1. Presets (Fastest)

```typescript
import { Presets } from "./core/factory";

const helix = Presets.fullHelix();      // 7-pair helical cascade
const grid = Presets.grid(4);            // 4x4 saddle grid
const observable = Presets.observable(); // With logging
```

#### 2. Builder (Fluent API)

```typescript
import { substrate } from "./core/factory";

const s = substrate()
  .placeSaddle([0, 0], 0)
  .placeSaddle([2, 0], 90)
  .addNode("input")
  .addNode("output")
  .connect("input", "output")
  .observable()
  .build();
```

#### 3. Factory (Configuration Object)

```typescript
import { SubstrateFactory } from "./core/factory";

const s = SubstrateFactory.create({
  dimensions: 2,
  helixPairs: 7,
  saddles: [
    { position: [0, 0], orientation: 0 },
    { position: [2, 0], orientation: 90 }
  ],
  nodes: ["A", "B"],
  edges: [["A", "B"]],
  observable: true
});
```

### BuiltSubstrate Interface

```typescript
interface BuiltSubstrate {
  field: SaddleField;           // Saddle surface field
  helix: HelicalCascade;        // 7-pair cascade
  network: SaddleNetwork;       // Compute graph
  dimension: Dimension;         // Observable state

  turnKey(key: 2 | 4 | 6): void;  // Turn a helix key
  cascade(): void;                 // Full cascade
  sample(p: number[]): number;     // Sample field at point
  flow(from, to, mag): StaticFlow; // Create flow vector
  step(): void;                    // Network propagation step
  reset(): void;                   // Reset all state
}
```

---

## 3. Core Manifold



### SaddleForm & SaddleField

Saddle surfaces modeled as z = xy geometry with rotational coupling.

```typescript
import { SaddleForm } from "./core/geometry/saddle";
import { SaddleField } from "./core/substrate/saddlefield";

// Single saddle at 45° rotation
const form = new SaddleForm(Math.PI / 4);
const z = form.valueAt(1, 2);  // Sample z at (x=1, y=2)

// Multi-saddle field
let field = new SaddleField();
field = field.place([0, 0], new SaddleForm(0));
field = field.place([2, 0], new SaddleForm(Math.PI / 2));

const value = field.scalarAt([1, 1]);
const grad = field.gradientAt([1, 1]);
```

**Key Concepts:**
- **Lock state (θ=0°)**: Ridges reinforce → positive coupling
- **Key state (θ=90°)**: Ridges oppose → negative coupling
- **90° rotation** = switching between point-to-point and broadcast flow

### SaddleNetwork

A compute graph that propagates signals through saddle couplings.

```typescript
import { SaddleNetwork } from "./core/substrate/saddlenetwork";

const net = new SaddleNetwork();
net.addNode("input");
net.addNode("hidden");
net.addNode("output");
net.connect("input", "hidden");
net.connect("hidden", "output");

net.write("input", 1.0);
net.step();  // Propagate
console.log(net.read("output"));
```

---

## Architectural Principles

The manifold system is built on three fundamental principles:

### 1. Deterministic Manifolds
The manifold **IS** the data. Given the same substrate configuration, you always get the same results. No caching is needed because the manifold structure itself provides constant-time access.

### 2. Versioned Substrates
Every mutation creates a new version. Old values persist, making the entire history naturally persistable. The `version` property tracks lineage:

```typescript
const d = dim(42);
console.log(d.version.id);        // Unique version ID
console.log(d.version.timestamp); // Creation time
console.log(d.version.parent);    // Parent version (or null)

// Create immutable new version
const d2 = d.withValue(100);      // d still has value 42
```

### 3. Persistence = Structure
Since substrates are versioned and manifolds are deterministic, the data structure itself is the persistence layer. No external database needed - the manifold holds the complete history.

### Performance Notes

- **Typed Arrays** - `stateTyped()` returns `Float64Array` for zero-allocation state access
- **Fast Drilling** - `drillPath()` accepts arrays to avoid rest parameter allocation
- **Bitwise Operations** - Turn-key detection uses bitwise AND for speed

---

## Quick Start Example

```typescript
import { dim, dimFrom } from "./core/dimensional";
import { SubstrateFactory } from "./core/factory";

// Create dimensional data structure
const app = dim({});
app.drill("config", "debug").value = true;
app.drill("users", "count").value = 42;

// Observe changes
app.drill("users", "count").observe((val, path) => {
  console.log(`${path.join(".")} changed to ${val}`);
});

// Create substrate
const substrate = SubstrateFactory.create({
  helixPairs: 7,
  observable: true
});

// Turn helix key
substrate.turnKey(4);  // Rotates pairs 3, 4, 5

// Sample the field
const z = substrate.sample([1, 1]);
```

---

## File Structure

```
core/
├── dimensional/          # Dimensional programming
│   ├── dimension.ts      # Dimension<T> class
│   ├── point.ts          # Point class and Address
│   ├── manifold-bridge.ts # Bridge to substrate
│   └── index.ts          # Exports
├── factory/              # Middleware layer
│   ├── substrate-factory.ts
│   ├── builder.ts        # Fluent builder + presets
│   └── index.ts
├── geometry/             # Geometric primitives
│   ├── saddle.ts         # SaddleForm, SaddlePair
│   ├── point.ts, line.ts, plane.ts, vector.ts
│   └── transform.ts
├── substrate/            # Core substrate
│   ├── flow.ts           # HelicalCascade, StaticFlow
│   ├── saddlefield.ts    # SaddleField
│   ├── saddlenetwork.ts  # SaddleNetwork
│   └── ...
└── ops.ts                # Vector math operations
```

