import { Body, BodyType, Vec2, Circle, DistanceJoint } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "soft-body",
  label: "Soft Body",
  featured: false,
  tags: ["DistanceJoint", "Springs", "Soft Body"],
  desc: "Soft bodies created with DistanceJoint springs connecting a grid of particles.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 400);
    addWalls(space, W, H);

    function createSoftBody(startX, startY, cols, rows, gap, colorIdx) {
      const bodies = [];
      for (let r = 0; r < rows; r++) {
        bodies[r] = [];
        for (let c = 0; c < cols; c++) {
          const b = new Body(BodyType.DYNAMIC, new Vec2(startX + c * gap, startY + r * gap));
          b.shapes.add(new Circle(4));
          try { b.userData._colorIdx = colorIdx; } catch(_) {}
          b.space = space;
          bodies[r][c] = b;
        }
      }
      function springConnect(b1, b2, restLen) {
        const dj = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), restLen * 0.8, restLen * 1.2);
        dj.stiff = false;
        dj.frequency = 15;
        dj.damping = 0.4;
        dj.space = space;
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (c < cols - 1) springConnect(bodies[r][c], bodies[r][c + 1], gap);
          if (r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c], gap);
          if (c < cols - 1 && r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c + 1], gap * Math.SQRT2);
          if (c > 0 && r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c - 1], gap * Math.SQRT2);
        }
      }
    }

    createSoftBody(W / 2 - 80, 60, 6, 6, 22, 0);
    createSoftBody(W / 2 + 40, 50, 5, 5, 26, 2);

    // Store factory for click handler
    space._createSoftBody = createSoftBody;
  },

  click(x, y, space, W, H) {
    const cols = 4 + Math.floor(Math.random() * 3);
    const rows = 4 + Math.floor(Math.random() * 3);
    if (space._createSoftBody) {
      space._createSoftBody(x, y, cols, rows, 20, Math.floor(Math.random() * 6));
    }
  },
};
