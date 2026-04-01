import { EntityStore } from "../../../core/substrate/entity-store";
import { Dimension, dimFrom } from "../../../core/dimensional";

// Physics engine using manifold-based calculations
export class PhysicsEngine {
  private physicsStore: EntityStore;
  private dimensionalState: Dimension<any>;
  private gravity: number = 9.81;
  private isRunning: boolean = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeStore();
    this.initializeDimensionalState();
  }

  private initializeStore(): void {
    // Create physics entity store
    this.physicsStore = new EntityStore("physics");

    // Manifold-based physics properties
    this.physicsStore.set("gravity", { x: 0, y: this.gravity });
  }

  private initializeDimensionalState(): void {
    this.dimensionalState = dimFrom({});
    this.dimensionalState.drill("physics", "status").value = "initialized";
    this.dimensionalState.drill("physics", "bodyCount").value = 0;
  }

  public addBody(id: string, properties: any): void {
    // Manifold-based body creation
    // Handle both { vx, vy } and { velocity: { x, y } } formats
    const velocity = properties.isStatic
      ? { x: 0, y: 0 }
      : properties.velocity || { x: properties.vx || 0, y: properties.vy || 0 };
    this.physicsStore.set(id, {
      ...properties,
      id,
      velocity,
      acceleration: properties.acceleration || { x: 0, y: 0 },
      mass: properties.mass || 1,
      isStatic: properties.isStatic || false
    });

    // Update dimensional state
    const currentCount = this.dimensionalState.drill("physics", "bodyCount").value as number;
    this.dimensionalState.drill("physics", "bodyCount").value = currentCount + 1;
  }

  public removeBody(id: string): boolean {
    const result = this.physicsStore.delete(id);
    if (result) {
      const currentCount = this.dimensionalState.drill("physics", "bodyCount").value as number;
      this.dimensionalState.drill("physics", "bodyCount").value = currentCount - 1;
    }
    return result;
  }

  public update(dt: number): void {
    if (!this.isRunning) return;

    // Manifold-based physics simulation
    const bodies = this.physicsStore.getAll().filter(({ id }) => id !== "gravity");
    bodies.forEach(({ id, entity }) => {
      if (entity.isStatic) return;

      // Manifold-based velocity update
      const vel = entity.velocity as { x: number; y: number };
      const acc = entity.acceleration as { x: number; y: number };
      const newVelocity = {
        x: vel.x + acc.x * dt,
        y: vel.y + acc.y * dt
      };

      // Manifold-based position update
      const newPosition = {
        x: (entity.x as number) + newVelocity.x * dt,
        y: (entity.y as number) + newVelocity.y * dt
      };

      // Manifold-based collision detection (simple bounds)
      if (newPosition.x < 0 || newPosition.x > 1000) {
        newVelocity.x *= -0.8; // Bounce with damping
        newPosition.x = Math.max(0, Math.min(1000, newPosition.x));
      }

      if (newPosition.y < 0 || newPosition.y > 600) {
        newVelocity.y *= -0.8;
        newPosition.y = Math.max(0, Math.min(600, newPosition.y));
      }

      // Manifold-based gravity application
      const gravity = this.physicsStore.get("gravity") as { x: number; y: number } | undefined;
      if (gravity) {
        newVelocity.y += gravity.y * dt;
      }

      // Update entity with manifold-based calculations
      this.physicsStore.set(id, {
        ...entity,
        velocity: newVelocity,
        x: newPosition.x,
        y: newPosition.y
      });
    });
  }

  public getBody(id: string): any {
    return this.physicsStore.get(id);
  }

  public getAllBodies(): any[] {
    return this.physicsStore.getAll()
      .filter(({ id }) => id !== "gravity")
      .map(({ entity }) => entity);
  }

  public start(): void {
    this.isRunning = true;
    this.dimensionalState.drill("physics", "status").value = "running";
    // Run physics tick loop (~60fps)
    this.tickInterval = setInterval(() => this.update(1 / 60), 1000 / 60);
    console.log("PhysicsEngine started - manifold-based");
  }

  public stop(): void {
    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.dimensionalState.drill("physics", "status").value = "stopped";
    console.log("PhysicsEngine stopped");
  }

  public getStats(): any {
    const bodyCount = this.dimensionalState.drill("physics", "bodyCount").value;
    return {
      status: this.dimensionalState.drill("physics", "status").value,
      bodies: bodyCount,
      bodyCount,
      gravity: this.physicsStore.get("gravity"),
      memoryUsage: this.physicsStore.getStats()
    };
  }
}
