"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom_1 = require("jsdom");
// Set up JSDOM for testing DOM-dependent code
const dom = new jsdom_1.JSDOM(`<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <canvas id="test-canvas"></canvas>
</body>
</html>`, {
    url: "http://localhost",
    pretendToBeVisual: true,
    resources: "usable"
});
// Expose DOM globals to the global scope
global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.CanvasRenderingContext2D = dom.window.CanvasRenderingContext2D;
global.performance = dom.window.performance;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
// Mock canvas getContext method
HTMLCanvasElement.prototype.getContext = function (contextType) {
    if (contextType === "2d") {
        return {
            fillStyle: "#000000",
            globalAlpha: 1,
            font: "12px Arial",
            fillRect: () => { },
            beginPath: () => { },
            arc: () => { },
            fill: () => { },
            stroke: () => { },
            drawImage: () => { },
            fillText: () => { },
            save: () => { },
            restore: () => { },
            translate: () => { },
            scale: () => { },
            rotate: () => { }
        };
    }
    return null;
};
// Mock document.createElement for canvas
document.createElement = function (tagName) {
    if (tagName.toLowerCase() === "canvas") {
        const canvas = dom.window.document.createElement("canvas");
        canvas.getContext = HTMLCanvasElement.prototype.getContext;
        return canvas;
    }
    return dom.window.document.createElement(tagName);
};
