
/**
 * Math utility for 3D Perspective Correction (Homography).
 * Given 4 source points (corners of a distorted wall in a photo) 
 * and 4 destination points (corners of a flat rectangle),
 * provides functions to map points between the two coordinate systems.
 */

export type Point = { x: number; y: number };

export class PerspectiveTransformer {
  private matrix: number[] = [];
  private inverseMatrix: number[] = [];

  constructor(src: [Point, Point, Point, Point], dst: [Point, Point, Point, Point]) {
    this.matrix = this.getHomographyMatrix(src, dst);
    this.inverseMatrix = this.getHomographyMatrix(dst, src);
  }

  /**
   * Maps a point from the Source image (distorted) to the Destination (flat) coordinates.
   */
  public toFlat(x: number, y: number): Point {
    return this.transform(x, y, this.matrix);
  }

  /**
   * Maps a point from the Destination (flat) coordinates back to the Source image (distorted).
   * Used to position "flat-defined" UI elements onto the distorted wall properly.
   */
  public toDistorted(x: number, y: number): Point {
    return this.transform(x, y, this.inverseMatrix);
  }

  /**
   * Calculates the Homography Matrix H that maps src points to dst points.
   * H * [x, y, 1]^T = [w*u, w*v, w]^T
   * Solves linear system using Gaussian elimination.
   */
  private getHomographyMatrix(src: Point[], dst: Point[]): number[] {
    let A: number[][] = [];
    let B: number[] = [];

    for (let i = 0; i < 4; i++) {
        let sx = src[i].x;
        let sy = src[i].y;
        let dx = dst[i].x;
        let dy = dst[i].y;

        A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
        A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
        B.push(dx);
        B.push(dy);
    }

    const h = this.solveGaussian(A, B);
    h.push(1); // h33 is always 1
    return h;
  }

  /**
   * Solves Ax = B using Gaussian Elimination
   */
  private solveGaussian(A: number[][], B: number[]): number[] {
    const n = A.length;

    for (let i = 0; i < n; i++) {
        // Pivot
        let maxRow = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
                maxRow = j;
            }
        }
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [B[i], B[maxRow]] = [B[maxRow], B[i]];

        // Eliminate
        for (let j = i + 1; j < n; j++) {
            const factor = A[j][i] / A[i][i];
            B[j] -= factor * B[i];
            for (let k = i; k < n; k++) {
                A[j][k] -= factor * A[i][k];
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        x[i] = (B[i] - sum) / A[i][i];
    }
    return x;
  }

  /**
   * Applies the transformation matrix to a point.
   */
  private transform(x: number, y: number, matrix: number[]): Point {
    const a = matrix[0], b = matrix[1], c = matrix[2];
    const d = matrix[3], e = matrix[4], f = matrix[5];
    const g = matrix[6], h = matrix[7], i = matrix[8];

    const w = g * x + h * y + i;
    const px = (a * x + b * y + c) / w;
    const py = (d * x + e * y + f) / w;

    return { x: px, y: py };
  }
}
