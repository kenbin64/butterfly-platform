"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedManifoldApp = void 0;
const enhanced_main_app_1 = require("./enhanced-main-app");
// Enhanced manifold-based application bootstrap
class EnhancedManifoldApp {
    constructor() {
        this.app = null;
        this.canvas = null;
        this.optimizationLevel = 3;
        this.initialize();
    }
    initialize() {
        // Enhanced manifold-based initialization
        console.log("EnhancedManifoldApp initializing...");
        // Enhanced manifold-based application creation
        this.app = new enhanced_main_app_1.EnhancedMainApp();
        // Enhanced manifold-based entity creation
        this.createEnhancedInitialEntities();
        // Enhanced manifold-based application start
        this.start();
    }
    createEnhancedInitialEntities() {
        // Enhanced manifold-based entity creation
        if (this.app) {
            // Enhanced manifold-based player creation
            this.app.createEnhancedPlayer(100, 100);
            // Enhanced manifold-based enemies creation
            for (let i = 0; i < 5; i++) {
                const x = 200 + Math.random() * 400;
                const y = 100 + Math.random() * 300;
                this.app.createEnhancedEnemy(x, y);
            }
        }
    }
    start() {
        // Enhanced manifold-based application start
        if (this.app) {
            this.app.start();
            this.setupEnhancedCanvas();
            this.setupEnhancedEventListeners();
        }
    }
    setupEnhancedCanvas() {
        // Enhanced manifold-based canvas setup
        if (this.app) {
            this.canvas = this.app.getCanvas();
            if (this.canvas) {
                document.body.style.margin = "0";
                document.body.style.backgroundColor = "#000000";
                document.body.appendChild(this.canvas);
                // Enhanced manifold-based canvas styling
                this.canvas.style.border = "1px solid #333333";
                this.canvas.style.display = "block";
                this.canvas.style.margin = "0 auto";
                this.canvas.style.backgroundColor = "#000000";
            }
        }
    }
    setupEnhancedEventListeners() {
        // Enhanced manifold-based event listeners
        if (this.canvas) {
            this.canvas.addEventListener("click", (event) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                // Enhanced manifold-based click handling
                if (this.app) {
                    this.app.createEnhancedPlayer(x, y);
                }
            });
            window.addEventListener("keydown", (event) => {
                // Enhanced manifold-based keyboard input
                if (event.key === " ") {
                    // Enhanced manifold-based space bar handling
                    if (this.app) {
                        const x = Math.random() * this.canvas.width;
                        const y = Math.random() * this.canvas.height;
                        this.app.createEnhancedEnemy(x, y);
                    }
                }
                else if (event.key === "1") {
                    // Enhanced manifold-based optimization level 1
                    this.setOptimizationLevel(1);
                }
                else if (event.key === "2") {
                    // Enhanced manifold-based optimization level 2
                    this.setOptimizationLevel(2);
                }
                else if (event.key === "3") {
                    // Enhanced manifold-based optimization level 3
                    this.setOptimizationLevel(3);
                }
                else if (event.key === "4") {
                    // Enhanced manifold-based optimization level 4
                    this.setOptimizationLevel(4);
                }
                else if (event.key === "5") {
                    // Enhanced manifold-based optimization level 5
                    this.setOptimizationLevel(5);
                }
            });
        }
    }
    setOptimizationLevel(level) {
        // Enhanced manifold-based optimization level setting
        if (this.app) {
            this.app.setOptimizationLevel(level);
            this.optimizationLevel = level;
            console.log(`Enhanced optimization level set to: ${level}`);
        }
    }
    getEnhancedStats() {
        if (this.app) {
            return this.app.getEnhancedStats();
        }
        return null;
    }
    getEnhancedCanvas() {
        return this.canvas;
    }
}
// Enhanced manifold-based application entry point
const enhancedManifoldApp = new EnhancedManifoldApp();
exports.enhancedManifoldApp = enhancedManifoldApp;
