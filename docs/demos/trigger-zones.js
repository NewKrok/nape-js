import { Body, BodyType, Vec2, Circle, Polygon, Material, TriggerZone } from "../nape-js.esm.js?v=3.41.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

/**
 * Each zone tracks how many bodies are currently inside it,
 * and how many total entries occurred. The demo stores this
 * state in body.userData so the renderer can color them.
 */
const ZONE_COLORS = [
  { name: "green",  idx: 2 },
  { name: "red",    idx: 3 },
  { name: "blue",   idx: 0 },
];

/** Create a regular polygon (convex) as an array of Vec2. */
function regularPoly(cx, cy, radius, sides) {
  const verts = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    verts.push(new Vec2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  return verts;
}

export default {
  id: "trigger-zones",
  label: "Trigger Zones",
  tags: ["TriggerZone", "Sensor", "Callback"],
  featured: false,
  desc: "Bodies fall through colored trigger zones (circle, box, polygon). Counters show <b>enter/exit</b> events and current <b>occupancy</b> — powered by the high-level <code>TriggerZone</code> API.",
  walls: true,
  workerCompatible: false,

  /** @type {{ zones: { zone: TriggerZone, count: number, total: number, label: string }[] }} */
  _state: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 300);

    const zones = [];

    // --- Zone 1: Circle (green) ---
    const circleR = 70;
    const circleBody = new Body(BodyType.STATIC, new Vec2(160, 260));
    circleBody.shapes.add(new Circle(circleR));
    try {
      circleBody.userData._colorIdx = ZONE_COLORS[0].idx;
      circleBody.userData._isZone = true;
      circleBody.userData._zoneShape = "circle";
      circleBody.userData._zoneR = circleR;
    } catch (_) {}
    circleBody.space = space;

    // --- Zone 2: Box (red) ---
    const boxW = 160, boxH = 120;
    const boxBody = new Body(BodyType.STATIC, new Vec2(W / 2, 320));
    boxBody.shapes.add(new Polygon(Polygon.box(boxW, boxH)));
    try {
      boxBody.userData._colorIdx = ZONE_COLORS[1].idx;
      boxBody.userData._isZone = true;
      boxBody.userData._zoneShape = "box";
      boxBody.userData._zoneW = boxW;
      boxBody.userData._zoneH = boxH;
    } catch (_) {}
    boxBody.space = space;

    // --- Zone 3: Hexagon (blue) ---
    const hexR = 70;
    const hexBody = new Body(BodyType.STATIC, new Vec2(W - 160, 260));
    hexBody.shapes.add(new Polygon(regularPoly(0, 0, hexR, 6)));
    try {
      hexBody.userData._colorIdx = ZONE_COLORS[2].idx;
      hexBody.userData._isZone = true;
      hexBody.userData._zoneShape = "hex";
      hexBody.userData._zoneR = hexR;
    } catch (_) {}
    hexBody.space = space;

    const bodies = [circleBody, boxBody, hexBody];
    for (let i = 0; i < bodies.length; i++) {
      const state = { zone: null, count: 0, total: 0, label: ZONE_COLORS[i].name };
      const zone = new TriggerZone(space, bodies[i], {
        onEnter: () => { state.count++; state.total++; },
        onExit: () => { state.count = Math.max(0, state.count - 1); },
      });
      state.zone = zone;
      zones.push(state);
    }

    this._state = { zones };

    // Spawn initial bodies above the zones
    for (let i = 0; i < 30; i++) {
      spawnRandomShape(
        space,
        80 + Math.random() * (W - 160),
        20 + Math.random() * 120,
      );
    }
  },

  step(space) {
    // Recycle bodies that fall below the scene — move them back to the top
    for (const body of space.bodies) {
      if (body.isDynamic() && body.position.y > 550) {
        body.position = new Vec2(
          80 + Math.random() * 740,
          -20 - Math.random() * 60,
        );
        body.velocity = new Vec2(0, 0);
        body.angularVel = 0;
      }
    }
  },

  click(x, y, space) {
    for (let i = 0; i < 5; i++) {
      spawnRandomShape(
        space,
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
      );
    }
  },

  render(ctx, space, W, H, showOutlines) {
    const FILLS = ["rgba(63,185,80,0.18)", "rgba(255,70,70,0.18)", "rgba(88,166,255,0.18)"];
    const STROKES = ["#3fb950", "#ff4646", "#58a6ff"];

    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);

    // Draw zone shapes + counters
    if (this._state) {
      for (let i = 0; i < this._state.zones.length; i++) {
        const z = this._state.zones[i];
        const body = z.zone.body;
        const ud = body.userData;
        const px = body.position.x;
        const py = body.position.y;

        ctx.save();
        ctx.fillStyle = FILLS[i];
        ctx.strokeStyle = STROKES[i];
        ctx.lineWidth = 2;

        let labelY = py; // y position for the counter label

        if (ud._zoneShape === "circle") {
          const r = ud._zoneR;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          labelY = py - r - 8;
        } else if (ud._zoneShape === "box") {
          const hw = ud._zoneW / 2;
          const hh = ud._zoneH / 2;
          ctx.fillRect(px - hw, py - hh, hw * 2, hh * 2);
          ctx.strokeRect(px - hw, py - hh, hw * 2, hh * 2);
          labelY = py - hh - 8;
        } else if (ud._zoneShape === "hex") {
          const r = ud._zoneR;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2 - Math.PI / 2;
            const vx = px + Math.cos(a) * r;
            const vy = py + Math.sin(a) * r;
            j === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          labelY = py - r - 8;
        }

        // Counter label above zone
        ctx.fillStyle = "#e6edf3";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`inside: ${z.count}  total: ${z.total}`, px, labelY);
        ctx.restore();
      }
    }

    // Draw bodies
    for (const body of space.bodies) {
      drawBody(ctx, body, showOutlines);
    }
  },

  render3dOverlay(ctx, space, W, H) {
    if (!this._state) return;
    const STROKES = ["#3fb950", "#ff4646", "#58a6ff"];
    for (let i = 0; i < this._state.zones.length; i++) {
      const z = this._state.zones[i];
      const body = z.zone.body;
      const ud = body.userData;
      const px = body.position.x;
      const py = body.position.y;
      const r = ud._zoneR ?? ud._zoneH / 2;

      ctx.save();
      ctx.fillStyle = STROKES[i];
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`inside: ${z.count}  total: ${z.total}`, px, py - r - 8);
      ctx.restore();
    }
  },

};
