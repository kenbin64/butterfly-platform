"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Line = void 0;
const point_1 = require("./point");
const ops_1 = require("../ops");
class Line {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
    // Evaluate the line at parameter t.
    at(t) {
        const scaled = (0, ops_1.scale)(this.direction, t);
        const coords = (0, ops_1.add)(this.origin.coords, scaled);
        return new point_1.Point(coords);
    }
    // Compute the shortest distance from a point to this line.
    distanceToPoint(p) {
        // Vector from origin to p
        const op = p.coords.map((v, i) => v - this.origin.coords[i]);
        // Project op onto direction
        const dDotD = (0, ops_1.dot)(this.direction, this.direction);
        const t = (0, ops_1.dot)(op, this.direction) / dDotD;
        // Closest point on line
        const closest = this.at(t);
        // Distance between p and closest
        let sum = 0;
        for (let i = 0; i < p.coords.length; i++) {
            const diff = p.coords[i] - closest.coords[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
    // Apply a geometric transform to the entire line.
    transformed(T) {
        const newOrigin = T.applyToPoint(this.origin);
        const newDirection = T.applyToVector(this.direction);
        return new Line(newOrigin, newDirection);
    }
}
exports.Line = Line;
