"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Line = void 0;
const point_1 = require("./point");
const ops_1 = require("../ops");
// A line in N-dimensional space defined by a point and a direction vector.
// Parametric form: L(t) = point + t * direction
class Line {
    constructor(point, direction) {
        this.point = point;
        this.direction = direction;
    }
    // Compute a point on the line at parameter t.
    at(t) {
        const out = [];
        for (let i = 0; i < this.point.coords.length; i++) {
            out.push(this.point.coords[i] + this.direction[i] * t);
        }
        return new point_1.Point(out);
    }
    // Compute the closest point on the line to another point.
    closestPointTo(p) {
        const diff = [];
        for (let i = 0; i < p.coords.length; i++) {
            diff.push(p.coords[i] - this.point.coords[i]);
        }
        const denom = (0, ops_1.dot)(this.direction, this.direction);
        const t = (0, ops_1.dot)(diff, this.direction) / denom;
        return this.at(t);
    }
    // Distance from a point to the line.
    distanceToPoint(p) {
        const closest = this.closestPointTo(p);
        let sum = 0;
        for (let i = 0; i < p.coords.length; i++) {
            const d = p.coords[i] - closest.coords[i];
            sum += d * d;
        }
        return Math.sqrt(sum);
    }
}
exports.Line = Line;
