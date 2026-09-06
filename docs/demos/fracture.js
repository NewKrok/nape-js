import {
  Body, BodyType, Vec2, Circle, Polygon, Space,
  fractureBody, computeVoronoi, generateFractureSites,
} from "../nape-js.esm.js?v=3.42.0";

// Fracture color palette — warm tones for fragments
const FRAG_COLORS = [
  "#f85149", "#d29922", "#58a6ff", "#a371f7", "#3fb950", "#dbabff",
  "#ff7b72", "#ffa657", "#79c0ff", "#d2a8ff", "#7ee787", "#f0883e",
];

let blastRadius = 90;
let fragmentCount = 3;

function createBreakableBox(space, x, y, w, h, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  body.userData._colorIdx = colorIdx;
  body.userData._breakable = true;
  body.space = space;
  return body;
}

function createBreakableHex(space, x, y, r, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.regular(r, r, 6)));
  body.userData._colorIdx = colorIdx;
  body.userData._breakable = true;
  body.space = space;
  return body;
}

function createBreakableOctagon(space, x, y, r, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.regular(r, r, 8)));
  body.userData._colorIdx = colorIdx;
  body.userData._breakable = true;
  body.space = space;
  return body;
}

function doFracture(clickX, clickY, space) {
  // Find all breakable bodies near click
  const toFracture = [];
  for (const body of space.bodies) {
    if (body.isStatic()) continue;
    if (!body.userData._breakable) continue;
    const dx = body.position.x - clickX;
    const dy = body.position.y - clickY;
    if (dx * dx + dy * dy < blastRadius * blastRadius) {
      toFracture.push(body);
    }
  }

  for (const body of toFracture) {
    // Determine a color for fragments based on original
    const baseColor = (body.userData._colorIdx || 0) % FRAG_COLORS.length;

    try {
      const result = fractureBody(body, Vec2.get(clickX, clickY), {
        fragmentCount,
        explosionImpulse: 150,
      });

      // Color the fragments — only allow re-fracture above a minimum size
      const MIN_BREAKABLE_AREA = 350;
      result.fragments.forEach((f, i) => {
        f.userData._colorIdx = (baseColor + i) % FRAG_COLORS.length;
        f.userData._breakable = f.shapes.at(0).area >= MIN_BREAKABLE_AREA;
        f.userData._fragment = true;
      });
    } catch {
      // Skip bodies that can't be fractured (e.g. circles)
    }
  }
}

export default {
  id: "fracture",
  label: "Voronoi Fracture",
  tags: ["Destruction", "Voronoi", "Click", "Compound"],
  featured: true,
  featuredOrder: 2,
  desc:
    '<b>Click</b> on objects to shatter them with Voronoi fracture. Fragments can be re-fractured! <b>Scroll</b> to change blast radius.',
  walls: true,
  workerCompatible: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Build a wall of breakable objects
    const bw = 70, bh = 50;
    const cols = 7, rows = 5;
    const startX = (W - cols * bw) / 2 + bw / 2;
    const startY = H - 60 - rows * bh + bh / 2;

    let colorIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * bw + (r % 2 ? bw / 2 : 0);
        const y = startY + r * bh;
        if (x > W - 60 || x < 60) continue;
        createBreakableBox(space, x, y, bw - 4, bh - 4, colorIdx++ % 6);
      }
    }

    // Add some hexagons and octagons on top
    for (let i = 0; i < 5; i++) {
      createBreakableHex(space, 200 + i * 130, startY - 80, 30, colorIdx++ % 6);
    }
    for (let i = 0; i < 3; i++) {
      createBreakableOctagon(space, 250 + i * 170, startY - 160, 35, colorIdx++ % 6);
    }
  },

  click(x, y, space) {
    doFracture(x, y, space);
  },

  wheel(deltaY) {
    blastRadius = Math.max(50, Math.min(500, blastRadius + deltaY * 0.5));
    fragmentCount = Math.max(3, Math.min(20, Math.round(blastRadius / 30)));
  },

  // Overlay: show blast radius circle (bodies are drawn by the default renderer)
  render3dOverlay(ctx, space, W, H) {
    // Blast radius indicator follows the mouse — stored via hover
    if (this._mouseX != null) {
      ctx.beginPath();
      ctx.arc(this._mouseX, this._mouseY, blastRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(248,81,73,0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },

  hover(x, y) {
    this._mouseX = x;
    this._mouseY = y;
  },

};
