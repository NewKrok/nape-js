import { getNape } from "../core/engine";
import type { Vec2 } from "./Vec2";
import type { AABB } from "./AABB";

// Side-effect import: ensure GeomPoly is registered in the namespace
// before ZPP_MarchingSquares.run() tries to access nape.geom.GeomPoly.get().
import "./GeomPoly";

type Any = any;

/**
 * Isosurface extraction using the marching squares algorithm.
 *
 * Static utility class — all functionality is in the `run()` method.
 *
 * Converted from nape-compiled.js lines 16879–17258.
 */
export class MarchingSquares {
  static __name__ = ["nape", "geom", "MarchingSquares"];

  /**
   * Run the marching squares algorithm to extract polygons from an iso function.
   *
   * @param iso - Iso function `(x: number, y: number) => number`.
   *              Negative values are "inside", positive are "outside".
   * @param bounds - AABB defining the region to extract surfaces from.
   * @param cellsize - Vec2 defining cell dimensions. Auto-disposed if weak.
   * @param quality - Interpolation quality (default 2). Must be >= 0.
   * @param subgrid - Optional Vec2 for sub-grid partitioning. Auto-disposed if weak.
   * @param combine - Whether to combine adjacent polygons (default true).
   * @param output - Optional GeomPolyList to populate. If null, a new one is created.
   * @returns The populated GeomPolyList.
   */
  static run(
    iso: (x: number, y: number) => number,
    bounds: AABB,
    cellsize: Vec2,
    quality: number = 2,
    subgrid: Vec2 | null = null,
    combine: boolean = true,
    output: Any = null,
  ): Any {
    // --- Validate disposed Vec2 ---
    if (cellsize != null && (cellsize as Any).zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (subgrid != null && (subgrid as Any).zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }

    // --- Validate required parameters ---
    if (iso == null) {
      throw new Error(
        "Error: MarchingSquares requires an iso function to operate",
      );
    }
    if (bounds == null) {
      throw new Error(
        "Error: MarchingSquares requires an AABB to define bounds of surface extraction",
      );
    }
    if (cellsize == null) {
      throw new Error(
        "Error: MarchingSquares requires a Vec2 to define cell size for surface extraction",
      );
    }

    // --- Validate cellsize dimensions ---
    const cellZpp = (cellsize as Any).zpp_inner;
    if (cellZpp._validate != null) {
      cellZpp._validate();
    }
    if (cellZpp.x <= 0 || cellZpp.y <= 0) {
      throw new Error(
        "Error: MarchingSquares cannot operate with non-positive cell dimensions",
      );
    }

    // --- Validate quality ---
    if (quality < 0) {
      throw new Error(
        "Error: MarchingSquares cannot use a negative quality value for interpolation",
      );
    }

    // --- Validate subgrid dimensions ---
    if (subgrid != null) {
      const subZpp = (subgrid as Any).zpp_inner;
      if (subZpp._validate != null) {
        subZpp._validate();
      }
      if (subZpp.x <= 0 || subZpp.y <= 0) {
        throw new Error(
          "Error: MarchingSquares cannot with non-positive sub-grid dimensions",
        );
      }
    }

    // --- Get or create output list ---
    const nape = getNape();
    const ret = output != null ? output : new nape.geom.GeomPolyList();
    const zppMs = nape.__zpp.geom.ZPP_MarchingSquares;

    // --- Extract bounds ---
    const boundsZpp = (bounds as Any).zpp_inner;
    if (boundsZpp._validate != null) {
      boundsZpp._validate();
    }

    if (subgrid == null) {
      // Single run over entire bounds
      const bx0 = boundsZpp.minx;
      const by0 = boundsZpp.miny;
      const bx1 = boundsZpp.maxx;
      const by1 = boundsZpp.maxy;
      zppMs.run(iso, bx0, by0, bx1, by1, cellsize, quality, combine, ret);
    } else {
      // Partition bounds into subgrid cells
      const subZpp = (subgrid as Any).zpp_inner;
      if (subZpp._validate != null) {
        subZpp._validate();
      }

      const xp = boundsZpp.maxx - boundsZpp.minx;
      const yp = boundsZpp.maxy - boundsZpp.miny;
      const xp1 = xp / subZpp.x;
      const yp1 = yp / subZpp.y;
      let xn = xp1 | 0;
      let yn = yp1 | 0;
      if (xn !== xp1) ++xn;
      if (yn !== yp1) ++yn;

      for (let xi = 0; xi < xn; xi++) {
        const x0 = boundsZpp.minx + subZpp.x * xi;
        const x1 =
          xi === xn - 1 ? boundsZpp.maxx : x0 + subZpp.x;

        for (let yi = 0; yi < yn; yi++) {
          const y0 = boundsZpp.miny + subZpp.y * yi;
          const y1 =
            yi === yn - 1 ? boundsZpp.maxy : y0 + subZpp.y;
          zppMs.run(iso, x0, y0, x1, y1, cellsize, quality, combine, ret);
        }
      }
    }

    // --- Dispose weak Vec2 references ---
    if (cellZpp.weak) {
      (cellsize as Any).dispose();
    }
    if (subgrid != null && (subgrid as Any).zpp_inner.weak) {
      (subgrid as Any).dispose();
    }

    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace (replaces compiled MarchingSquares)
// ---------------------------------------------------------------------------
const nape = getNape();
nape.geom.MarchingSquares = MarchingSquares;
(MarchingSquares.prototype as Any).__class__ = MarchingSquares;
