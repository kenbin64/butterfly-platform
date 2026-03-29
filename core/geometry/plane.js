"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plane = void 0;
const point_1 = require("./point");
const ops_1 = require("../ops");
class Plane {
    constructor(point, normal) {
        this.point = point;
        this.normal = normal;
    }
    // Signed distance from a point to the plane.
    distanceToPoint(p) {
        // Vector from plane point to p
        const v = p.coords.map((v, i) => v - this.point.coords[i]);
        // Projection of v onto the normal
        const nDotN = (0, ops_1.dot)(this.normal, this.normal);
        const t = (0, ops_1.dot)(v, this.normal) / nDotN;
        // Signed distance = projection length
        return t;
    }
    // Project a point onto the plane.
    projectPoint(p) {
        const dist = this.distanceToPoint(p);
        const offset = (0, ops_1.scale)(this.normal, dist);
        const projected = (0, ops_1.add)(p.coords, offset.map(x => -x));
        return new point_1.Point(projected);
    }
    // Apply a geometric transform to the plane.
    transformed(T) {
        const newPoint = T.applyToPoint(this.point);
        const newNormal = T.applyToVector(this.normal);
        return new Plane(newPoint, newNormal);
    }
}
exports.Plane = Plane;
