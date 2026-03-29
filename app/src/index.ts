import { MainApp } from "./main-app";

// Manifold-based application bootstrap
class ManifoldApp {
  private app: MainApp | null = null;
  private canvas: HTMLCanvasElement | null = null;
  // DOM library references for TypeScript
  /** @type {HTMLCanvasElement} */
  private canvasElement: any;
  /** @type {Document} */
  private document: any;
  /** @type {Window} */
  private window: any;

constructor() {
    this.initialize();
  }

private initialize(): void {
    // Manifold-based initialization
    console.log("ManifoldApp initializing...");
    // DOM library references
    this.document = document;
    this.window = window;
    
    // Create main application
    this.app = new MainApp();
    
    // Create initial entities
    this.createInitialEntities();
    
    // Start the application
    this.start();
  }

private createInitialEntities(): void {
    // Manifold-based entity creation
    if (this.app) {
      // Create player
      this.app.createPlayer(100, 100);
      
      // Create enemies
      for (let i = 0; i < 5; i++) {
        const x = 200 + Math.random() * 400;
        const y = 100 + Math.random() * 300;
        this.app.createEnemy(x, y);
      }
    }
  }

  private start(): void {
    // Manifold-based application start
    if (this.app) {
      this.app.start();
      this.setupCanvas();
      this.setupEventListeners();
    }
  }

private setupCanvas(): void {
    // Manifold-based canvas setup
    if (this.app) {
      this.canvas = this.app.getCanvas();
      if (this.canvas) {
        this.document.body.style.margin = "0";
        this.document.body.style.backgroundColor = "#000000";
        this.document.body.appendChild(this.canvas);
        
        // Manifold-based canvas styling
        this.canvas.style.border = "1px solid #333333";
        this.canvas.style.display = "block";
        this.canvas.style.margin = "0 auto";
        this.canvas.style.backgroundColor = "#000000";
      }
    }
  }

private setupEventListeners(): void {
    // Manifold-based event listeners
    if (this.canvas) {
      this.canvas.addEventListener("click", (event: any) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Manifold-based click handling
        if (this.app) {
          this.app.createPlayer(x, y);
        }
      });
      
this.window.addEventListener("keydown", (event: any) => {
        // Manifold-based keyboard input
        if (event.key === " ") {
          // Space bar - create enemy
          if (this.app) {
            const x = Math.random() * this.canvas.width
            const y = Math.random() * this.canvas.height
            this.app.createEnemy(x, y);
          }
        }
      });
    }
  }

  public getStats(): any {
    if (this.app) {
      return this.app.getStats();
    }
    return null;
  }

public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
}

// Manifold-based application entry point
const manifoldApp = new ManifoldApp();

// Export for testing
export { manifoldApp };