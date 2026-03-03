/**
 * ZPP_Geom — Internal shape geometry validation for the nape physics engine.
 *
 * Validates and updates shape global axes, vertices, edges, AABBs, and world COMs.
 *
 * Converted from nape-compiled.js lines 26135–26462.
 */

type Any = any;

export class ZPP_Geom {
  static __name__ = ["zpp_nape", "geom", "ZPP_Geom"];

  __class__: Any = ZPP_Geom;

  /** Validate and update all derived geometry for a shape. */
  static validateShape(s: Any): void {
    if (s.type == 1) {
      const _this = s.polygon;
      if (_this.zip_gaxi) {
        if (_this.body != null) {
          _this.zip_gaxi = false;
          _this.validate_laxi();
          const _this1 = _this.body;
          if (_this1.zip_axis) {
            _this1.zip_axis = false;
            _this1.axisx = Math.sin(_this1.rot);
            _this1.axisy = Math.cos(_this1.rot);
          }
          if (_this.zip_gverts) {
            if (_this.body != null) {
              _this.zip_gverts = false;
              _this.validate_lverts();
              const _this2 = _this.body;
              if (_this2.zip_axis) {
                _this2.zip_axis = false;
                _this2.axisx = Math.sin(_this2.rot);
                _this2.axisy = Math.cos(_this2.rot);
              }
              let li = _this.lverts.next;
              let cx_ite = _this.gverts.next;
              while (cx_ite != null) {
                const g = cx_ite;
                const l = li;
                li = li.next;
                g.x =
                  _this.body.posx +
                  (_this.body.axisy * l.x - _this.body.axisx * l.y);
                g.y =
                  _this.body.posy +
                  (l.x * _this.body.axisx + l.y * _this.body.axisy);
                cx_ite = cx_ite.next;
              }
            }
          }
          let ite = _this.edges.head;
          let cx_ite1 = _this.gverts.next;
          let u = cx_ite1;
          cx_ite1 = cx_ite1.next;
          while (cx_ite1 != null) {
            const v = cx_ite1;
            const e = ite.elt;
            ite = ite.next;
            e.gp0 = u;
            e.gp1 = v;
            e.gnormx =
              _this.body.axisy * e.lnormx - _this.body.axisx * e.lnormy;
            e.gnormy =
              e.lnormx * _this.body.axisx + e.lnormy * _this.body.axisy;
            e.gprojection =
              _this.body.posx * e.gnormx +
              _this.body.posy * e.gnormy +
              e.lprojection;
            if (e.wrap_gnorm != null) {
              e.wrap_gnorm.zpp_inner.x = e.gnormx;
              e.wrap_gnorm.zpp_inner.y = e.gnormy;
            }
            e.tp0 = e.gp0.y * e.gnormx - e.gp0.x * e.gnormy;
            e.tp1 = e.gp1.y * e.gnormx - e.gp1.x * e.gnormy;
            u = v;
            cx_ite1 = cx_ite1.next;
          }
          const v1 = _this.gverts.next;
          const e1 = ite.elt;
          ite = ite.next;
          e1.gp0 = u;
          e1.gp1 = v1;
          e1.gnormx =
            _this.body.axisy * e1.lnormx - _this.body.axisx * e1.lnormy;
          e1.gnormy =
            e1.lnormx * _this.body.axisx + e1.lnormy * _this.body.axisy;
          e1.gprojection =
            _this.body.posx * e1.gnormx +
            _this.body.posy * e1.gnormy +
            e1.lprojection;
          if (e1.wrap_gnorm != null) {
            e1.wrap_gnorm.zpp_inner.x = e1.gnormx;
            e1.wrap_gnorm.zpp_inner.y = e1.gnormy;
          }
          e1.tp0 = e1.gp0.y * e1.gnormx - e1.gp0.x * e1.gnormy;
          e1.tp1 = e1.gp1.y * e1.gnormx - e1.gp1.x * e1.gnormy;
        }
      }
    }
    if (s.zip_aabb) {
      if (s.body != null) {
        s.zip_aabb = false;
        if (s.type == 0) {
          const _this3 = s.circle;
          ZPP_Geom._validateWorldCOM(_this3);
          const rx = _this3.radius;
          const ry = _this3.radius;
          _this3.aabb.minx = _this3.worldCOMx - rx;
          _this3.aabb.miny = _this3.worldCOMy - ry;
          _this3.aabb.maxx = _this3.worldCOMx + rx;
          _this3.aabb.maxy = _this3.worldCOMy + ry;
        } else {
          const _this6 = s.polygon;
          if (_this6.zip_gverts) {
            if (_this6.body != null) {
              _this6.zip_gverts = false;
              _this6.validate_lverts();
              const _this7 = _this6.body;
              if (_this7.zip_axis) {
                _this7.zip_axis = false;
                _this7.axisx = Math.sin(_this7.rot);
                _this7.axisy = Math.cos(_this7.rot);
              }
              let li1 = _this6.lverts.next;
              let cx_ite3 = _this6.gverts.next;
              while (cx_ite3 != null) {
                const g1 = cx_ite3;
                const l1 = li1;
                li1 = li1.next;
                g1.x =
                  _this6.body.posx +
                  (_this6.body.axisy * l1.x - _this6.body.axisx * l1.y);
                g1.y =
                  _this6.body.posy +
                  (l1.x * _this6.body.axisx + l1.y * _this6.body.axisy);
                cx_ite3 = cx_ite3.next;
              }
            }
          }
          if (_this6.lverts.next == null) {
            throw new Error(
              "Error: An empty polygon has no meaningful bounds",
            );
          }
          const p0 = _this6.gverts.next;
          _this6.aabb.minx = p0.x;
          _this6.aabb.miny = p0.y;
          _this6.aabb.maxx = p0.x;
          _this6.aabb.maxy = p0.y;
          let cx_ite4 = _this6.gverts.next.next;
          while (cx_ite4 != null) {
            const p = cx_ite4;
            if (p.x < _this6.aabb.minx) {
              _this6.aabb.minx = p.x;
            }
            if (p.x > _this6.aabb.maxx) {
              _this6.aabb.maxx = p.x;
            }
            if (p.y < _this6.aabb.miny) {
              _this6.aabb.miny = p.y;
            }
            if (p.y > _this6.aabb.maxy) {
              _this6.aabb.maxy = p.y;
            }
            cx_ite4 = cx_ite4.next;
          }
        }
      }
    }
    if (s.zip_worldCOM) {
      if (s.body != null) {
        s.zip_worldCOM = false;
        if (s.zip_localCOM) {
          s.zip_localCOM = false;
          if (s.type == 1) {
            ZPP_Geom._computePolygonLocalCOM(s.polygon);
          }
          if (s.wrap_localCOM != null) {
            s.wrap_localCOM.zpp_inner.x = s.localCOMx;
            s.wrap_localCOM.zpp_inner.y = s.localCOMy;
          }
        }
        const _this9 = s.body;
        if (_this9.zip_axis) {
          _this9.zip_axis = false;
          _this9.axisx = Math.sin(_this9.rot);
          _this9.axisy = Math.cos(_this9.rot);
        }
        s.worldCOMx =
          s.body.posx +
          (s.body.axisy * s.localCOMx - s.body.axisx * s.localCOMy);
        s.worldCOMy =
          s.body.posy +
          (s.localCOMx * s.body.axisx + s.localCOMy * s.body.axisy);
      }
    }
  }

  /** @internal Validate world COM of a circle shape (inlined from compiled code). */
  private static _validateWorldCOM(shape: Any): void {
    if (shape.zip_worldCOM) {
      if (shape.body != null) {
        shape.zip_worldCOM = false;
        if (shape.zip_localCOM) {
          shape.zip_localCOM = false;
          if (shape.type == 1) {
            ZPP_Geom._computePolygonLocalCOM(shape.polygon);
          }
          if (shape.wrap_localCOM != null) {
            shape.wrap_localCOM.zpp_inner.x = shape.localCOMx;
            shape.wrap_localCOM.zpp_inner.y = shape.localCOMy;
          }
        }
        const body = shape.body;
        if (body.zip_axis) {
          body.zip_axis = false;
          body.axisx = Math.sin(body.rot);
          body.axisy = Math.cos(body.rot);
        }
        shape.worldCOMx =
          shape.body.posx +
          (shape.body.axisy * shape.localCOMx -
            shape.body.axisx * shape.localCOMy);
        shape.worldCOMy =
          shape.body.posy +
          (shape.localCOMx * shape.body.axisx +
            shape.localCOMy * shape.body.axisy);
      }
    }
  }

  /** @internal Compute polygon local COM from vertex ring. */
  private static _computePolygonLocalCOM(poly: Any): void {
    if (poly.lverts.next == null) {
      throw new Error(
        "Error: An empty polygon has no meaningful localCOM",
      );
    }
    if (poly.lverts.next.next == null) {
      poly.localCOMx = poly.lverts.next.x;
      poly.localCOMy = poly.lverts.next.y;
    } else if (poly.lverts.next.next.next == null) {
      poly.localCOMx = poly.lverts.next.x;
      poly.localCOMy = poly.lverts.next.y;
      const t = 1.0;
      poly.localCOMx += poly.lverts.next.next.x * t;
      poly.localCOMy += poly.lverts.next.next.y * t;
      const t1 = 0.5;
      poly.localCOMx *= t1;
      poly.localCOMy *= t1;
    } else {
      poly.localCOMx = 0;
      poly.localCOMy = 0;
      let area = 0.0;
      let cx_ite = poly.lverts.next;
      let u = cx_ite;
      cx_ite = cx_ite.next;
      let v = cx_ite;
      cx_ite = cx_ite.next;
      while (cx_ite != null) {
        const w = cx_ite;
        area += v.x * (w.y - u.y);
        const cf = w.y * v.x - w.x * v.y;
        poly.localCOMx += (v.x + w.x) * cf;
        poly.localCOMy += (v.y + w.y) * cf;
        u = v;
        v = w;
        cx_ite = cx_ite.next;
      }
      // Handle wrap-around: v→first, first→second
      cx_ite = poly.lverts.next;
      const w1 = cx_ite;
      area += v.x * (w1.y - u.y);
      const cf1 = w1.y * v.x - w1.x * v.y;
      poly.localCOMx += (v.x + w1.x) * cf1;
      poly.localCOMy += (v.y + w1.y) * cf1;
      u = v;
      v = w1;
      cx_ite = cx_ite.next;
      const w2 = cx_ite;
      area += v.x * (w2.y - u.y);
      const cf2 = w2.y * v.x - w2.x * v.y;
      poly.localCOMx += (v.x + w2.x) * cf2;
      poly.localCOMy += (v.y + w2.y) * cf2;
      area = 1 / (3 * area);
      const t2 = area;
      poly.localCOMx *= t2;
      poly.localCOMy *= t2;
    }
  }
}
