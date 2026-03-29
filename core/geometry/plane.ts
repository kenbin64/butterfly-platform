import { Point } from "./point";
import { VecN } from "./vector";
import { dot, add, scale } from "../ops";

export class Plane {
    point: Point;        // a point on the plane
    normal: VecN;        // the plane's normal vector (must be non-zero)

    constructor(point: Point, normal: VecN) {
        this.point = point;
        this.normal = normal;
    }

    // Signed distance from a point to the plane.
    distanceToPoint(p: Point): number {
        // Vector from plane point to p
        const v = p.coords.map((v, i) => v - this.point.coords[i]);

        // Projection of v onto the normal
        const nDotN = dot(this.normal, this.normal);
        const t = dot(v, this.normal) / nDotN;

        // Signed distance = projection length
        return t;
    }

    // Project a point onto the plane.
    projectPoint(p: Point): Point {
        const dist = this.distanceToPoint(p);
        const offset = scale(this.normal, dist);
        const projected = add(p.coords, offset.map(x => -x));
        return new Point(projected);
    }

    // Apply a geometric transform to the plane.
    transformed(T: { applyToPoint: (p: Point) => Point; applyToVector: (v: VecN) => VecN }): Plane {
        const newPoint = T.applyToPoint(this.point);
        const newNormal = T.applyToVector(this.normal);
        return new Plane(newPoint, newNormal);
    }
}