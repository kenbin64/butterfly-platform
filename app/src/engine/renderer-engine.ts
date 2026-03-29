import { EntityStore } from "../../core/substrate/entity-store";
import { Dimension } from "../../core/dimensional";

// Renderer engine using manifold-based rendering
export class RendererEngine {
  private renderStore: EntityStore;
  private dimensionalState: Dimension<any>;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private isRunning: boolean = false;
  private frameCount: number = 0;

  constructor() {
    this.initializeCanvas();
    this.initializeStore();
    this.initializeDimensionalState();
  }

  private initializeCanvas(): void {
    // Manifold-based canvas creation
    this.canvas = document.createElement("canvas");
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.context = this.canvas.getContext("2d")!;
  }

  private initializeStore(): void {
    // Create render entity store
    this.renderStore = new EntityStore("render");
    
    // Manifold-based render properties
    this.renderStore.set("renderSettings", {
      backgroundColor: "#000000",
      showGrid: true,
      showFPS: true,
      showDebug: false
    });
    
    this.renderStore.set("camera", {
      x: 0,
      y: 0,
      zoom: 1,
      rotation: 0
    });
  }

  private initializeDimensionalState(): void {
    this.dimensionalState = Dimension.from({});
    this.dimensionalState.drill("renderer", "status").value = "initialized";
    this.dimensionalState.drill("renderer", "fps").value = 0;
    this.dimensionalState.drill("renderer", "frameTime").value = 0;
    this.dimensionalState.drill("renderer", "entitiesRendered").value = 0;
  }

  public createRenderable(id: string, type: string, properties: any): void {
    // Manifold-based renderable creation
    this.renderStore.set(id, {
      type,
      ...properties,
      visible: properties.visible !== false,
      zIndex: properties.zIndex || 0,
      color: properties.color || "#ffffff",
      opacity: properties.opacity || 1,
      created: Date.now()
    });
  }

  public removeRenderable(id: string): boolean {
    return this.renderStore.delete(id);
  }

  public updateRenderable(id: string, properties: any): void {
    const renderable = this.renderStore.get(id);
    if (renderable) {
      this.renderStore.set(id, { ...renderable, ...properties });
    }
  }

  public getRenderable(id: string): any {
    return this.renderStore.get(id);
  }

  public getAllRenderables(): any[] {
    return this.renderStore.getAll().map(({ entity }) => entity);
  }

  public render(entities: any[]): void {
    if (!this.isRunning) return;
    
    // Manifold-based rendering
    const startTime = performance.now();
    this.frameCount++;
    
    // Clear canvas with manifold-based background
    const settings = this.renderStore.get("renderSettings");
    if (settings) {
      this.context.fillStyle = settings.backgroundColor;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Manifold-based camera transformation
    const camera = this.renderStore.get("camera");
    this.context.save();
    this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.context.scale(camera.zoom, camera.zoom);
    this.context.rotate(camera.rotation);
    this.context.translate(-camera.x, -camera.y);
    
    // Manifold-based entity rendering
    const renderables = this.getAllRenderables();
    renderables.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    let entitiesRendered = 0;
    renderables.forEach(renderable => {
      if (!renderable.visible) return;
      
      // Manifold-based render logic
      switch (renderable.type) {
        case "rectangle":
          this.renderRectangle(renderable);
          entitiesRendered++;
          break;
        case "circle":
          this.renderCircle(renderable);
          entitiesRendered++;
          break;
        case "text":
          this.renderText(renderable);
          entitiesRendered++;
          break;
        case "image":
          this.renderImage(renderable);
          entitiesRendered++;
          break;
      }
    });
    
    // Manifold-based debug rendering
    if (settings && settings.showDebug) {
      this.renderDebugInfo(entities, entitiesRendered);
    }
    
    this.context.restore();
    
    // Manifold-based FPS calculation
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    this.dimensionalState.drill("renderer", "frameTime").value = frameTime;
    
    if (this.frameCount % 60 === 0) {
      this.dimensionalState.drill("renderer", "fps").value = Math.round(1000 / frameTime);
    }
    
    this.dimensionalState.drill("renderer", "entitiesRendered").value = entitiesRendered;
  }

  private renderRectangle(renderable: any): void {
    // Manifold-based rectangle rendering
    this.context.fillStyle = renderable.color;
    this.context.globalAlpha = renderable.opacity;
    this.context.fillRect(
      renderable.x - (renderable.width || 10) / 2,
      renderable.y - (renderable.height || 10) / 2,
      renderable.width || 10,
      renderable.height || 10
    );
  }

  private renderCircle(renderable: any): void {
    // Manifold-based circle rendering
    this.context.fillStyle = renderable.color;
    this.context.globalAlpha = renderable.opacity;
    this.context.beginPath();
    this.context.arc(renderable.x, renderable.y, renderable.radius || 10, 0, Math.PI * 2);
    this.context.fill();
  }

  private renderText(renderable: any): void {
    // Manifold-based text rendering
    this.context.fillStyle = renderable.color;
    this.context.globalAlpha = renderable.opacity;
    this.context.font = renderable.font || "12px Arial";
    this.context.fillText(
      renderable.text || "",
      renderable.x || 0,
      renderable.y || 0
    );
  }

  private renderImage(renderable: any): void {
    // Manifold-based image rendering
    if (renderable.image) {
      this.context.globalAlpha = renderable.opacity;
      this.context.drawImage(
        renderable.image,
        renderable.x - (renderable.width || renderable.image.width) / 2,
        renderable.y - (renderable.height || renderable.image.height) / 2,
        renderable.width || renderable.image.width,
        renderable.height || renderable.image.height
      );
    }
  }

  private renderDebugInfo(entities: any[], entitiesRendered: number): void {
    // Manifold-based debug rendering
    this.context.fillStyle = "#ffffff";
    this.context.globalAlpha = 0.7;
    this.context.font = "12px monospace";
    
    const debugInfo = [
      `FPS: ${this.dimensionalState.drill("renderer", "fps").value || 0}`,
      `Frame Time: ${this.dimensionalState.drill("renderer", "frameTime").value.toFixed(2)}ms`,
      `Entities: ${entitiesRendered}/${entities.length}`,
      `Camera: x=${this.renderStore.get("camera")?.x.toFixed(1)}, y=${this.renderStore.get("camera")?.y.toFixed(1)}`,
      `Zoom: ${this.renderStore.get("camera")?.zoom.toFixed(2)}`
    ];
    
    debugInfo.forEach((line, index) => {
      this.context.fillText(line, 10, 20 + index * 16);
    });
  }

  public start(): void {
    this.isRunning = true;
    this.dimensionalState.drill("renderer", "status").value = "running";
    console.log("RendererEngine started - manifold-based");
  }

  public stop(): void {
    this.isRunning = false;
    this.dimensionalState.drill("renderer", "status").value = "stopped";
    console.log("RendererEngine stopped");
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getStats(): any {
    return {
      status: this.dimensionalState.drill("renderer", "status").value,
      fps: this.dimensionalState.drill("renderer", "fps").value,
      frameTime: this.dimensionalState.drill("renderer", "frameTime").value,
      entitiesRendered: this.dimensionalState.drill("renderer", "entitiesRendered").value,
      canvasSize: { width: this.canvas.width, height: this.canvas.height },
      memoryUsage: this.renderStore.getStats()
    };
  }
}