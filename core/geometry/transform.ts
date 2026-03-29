import { Point } from "./point";
import { VecN } from "./vector";
import { Scalar } from "./scalar";
import { dot } from "../ops";

// A line in N-dimensional space defined by a point and a direction vector.
// Parametric form: L(t) = point + t * direction
export class Line {
    point: Point;
    direction: VecN;

    constructor(point: Point, direction: VecN) {
        this.point = point;
        this.direction = direction;
    }

    // Compute a point on the line at parameter t.
    at(t: Scalar): Point {
        const out: number[] = [];
        for (let i = 0; i < this.point.coords.length; i++) {
            out.push(this.point.coords[i] + this.direction[i] * t);
        }
        return new Point(out);
    }

    // Compute the closest point on the line to another point.
    closestPointTo(p: Point): Point {
        const diff: VecN = [];
        for (let i = 0; i < p.coords.length; i++) {
            diff.push(p.coords[i] - this.point.coords[i]);
        }

        const denom = dot(this.direction, this.direction);
        const t = dot(diff, this.direction) / denom;

        return this.at(t);
    }

    // Distance from a point to the line.
    distanceToPoint(p: Point): Scalar {
        const closest = this.closestPointTo(p);

        let sum = 0;
        for (let i = 0; i < p.coords.length; i++) {
            const d = p.coords[i] - closest.coords[i];
            sum += d * d;
        }

        return Math.sqrt(sum);
    }
}