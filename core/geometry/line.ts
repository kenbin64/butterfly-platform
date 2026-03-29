import { Point } from "./point";
import { VecN } from "./vector";
import { dot, add, scale } from "../ops";

export class Line {
    origin: Point;
    direction: VecN; // must be non-zero

    constructor(origin: Point, direction: VecN) {
        this.origin = origin;
        this.direction = direction;
    }

    // Evaluate the line at parameter t.
    at(t: number): Point {
        const scaled = scale(this.direction, t);
        const coords = add(this.origin.coords, scaled);
        return new Point(coords);
    }

    // Compute the shortest distance from a point to this line.
    distanceToPoint(p: Point): number {
        // Vector from origin to p
        const op = p.coords.map((v, i) => v - this.origin.coords[i]);

        // Project op onto direction
        const dDotD = dot(this.direction, this.direction);
        const t = dot(op, this.direction) / dDotD;

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
    transformed(T: { applyToPoint: (p: Point) => Point; applyToVector: (v: VecN) => VecN }): Line {
        const newOrigin = T.applyToPoint(this.origin);
        const newDirection = T.applyToVector(this.direction);
        return new Line(newOrigin, newDirection);
    }
}