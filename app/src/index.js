"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifoldApp = void 0;
const main_app_1 = require("./main-app");
// Manifold-based application bootstrap
class ManifoldApp {
    constructor() {
        this.app = null;
        this.canvas = null;
        this.initialize();
    }
    initialize() {
        // Manifold-based initialization
        console.log("ManifoldApp initializing...");
        // DOM library references
        this.document = document;
        this.window = window;
        // Create main application
        this.app = new main_app_1.MainApp();
        // Create initial entities
        this.createInitialEntities();
        // Start the application
        this.start();
    }
    createInitialEntities() {
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
    start() {
        // Manifold-based application start
        if (this.app) {
            this.app.start();
            this.setupCanvas();
            this.setupEventListeners();
        }
    }
    setupCanvas() {
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
    setupEventListeners() {
        // Manifold-based event listeners
        if (this.canvas) {
            this.canvas.addEventListener("click", (event) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                // Manifold-based click handling
                if (this.app) {
                    this.app.createPlayer(x, y);
                }
            });
            this.window.addEventListener("keydown", (event) => {
                // Manifold-based keyboard input
                if (event.key === " ") {
                    // Space bar - create enemy
                    if (this.app) {
                        const x = Math.random() * this.canvas.width;
                        const y = Math.random() * this.canvas.height;
                        this.app.createEnemy(x, y);
                    }
                }
            });
        }
    }
    getStats() {
        if (this.app) {
            return this.app.getStats();
        }
        return null;
    }
    getCanvas() {
        return this.canvas;
    }
}
// Manifold-based application entry point
const manifoldApp = new ManifoldApp();
exports.manifoldApp = manifoldApp;
