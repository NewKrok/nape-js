import { Body, BodyType, Vec2, Circle, Polygon, PivotJoint, AngleJoint } from "../nape-js.esm.js?v=3.41.0";

function spawnRagdoll(space, x, y, colorBase) {
  // Torso
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  try { torso.userData._colorIdx = colorBase; } catch(_) {}
  torso.space = space;

  // Head
  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  try { head.userData._colorIdx = colorBase; } catch(_) {}
  head.space = space;

  const neckPivot = new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12));
  neckPivot.space = space;
  const neckAngle = new AngleJoint(torso, head, -0.4, 0.4);
  neckAngle.stiff = false;
  neckAngle.frequency = 8;
  neckAngle.damping = 0.6;
  neckAngle.space = space;

  // Upper arms
  const armLen = 28, armW = 8;
  const lUpperArm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  lUpperArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { lUpperArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  lUpperArm.space = space;

  const rUpperArm = new Body(BodyType.DYNAMIC, new Vec2(x + 26, y - 14));
  rUpperArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { rUpperArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  rUpperArm.space = space;

  const lShoulderP = new PivotJoint(torso, lUpperArm, new Vec2(-12, -20), new Vec2(14, 0));
  lShoulderP.space = space;
  const lShoulderA = new AngleJoint(torso, lUpperArm, -Math.PI * 0.75, Math.PI * 0.75);
  lShoulderA.space = space;

  const rShoulderP = new PivotJoint(torso, rUpperArm, new Vec2(12, -20), new Vec2(-14, 0));
  rShoulderP.space = space;
  const rShoulderA = new AngleJoint(torso, rUpperArm, -Math.PI * 0.75, Math.PI * 0.75);
  rShoulderA.space = space;

  // Lower arms
  const lLowerArm = new Body(BodyType.DYNAMIC, new Vec2(x - 54, y - 14));
  lLowerArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { lLowerArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  lLowerArm.space = space;

  const rLowerArm = new Body(BodyType.DYNAMIC, new Vec2(x + 54, y - 14));
  rLowerArm.shapes.add(new Polygon(Polygon.box(armLen, armW)));
  try { rLowerArm.userData._colorIdx = colorBase + 1; } catch(_) {}
  rLowerArm.space = space;

  const lElbowP = new PivotJoint(lUpperArm, lLowerArm, new Vec2(-14, 0), new Vec2(14, 0));
  lElbowP.space = space;
  const lElbowA = new AngleJoint(lUpperArm, lLowerArm, -Math.PI * 0.6, 0.1);
  lElbowA.space = space;

  const rElbowP = new PivotJoint(rUpperArm, rLowerArm, new Vec2(14, 0), new Vec2(-14, 0));
  rElbowP.space = space;
  const rElbowA = new AngleJoint(rUpperArm, rLowerArm, -0.1, Math.PI * 0.6);
  rElbowA.space = space;

  // Upper legs
  const legLen = 32, legW = 10;
  const lUpperLeg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 40));
  lUpperLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { lUpperLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  lUpperLeg.space = space;

  const rUpperLeg = new Body(BodyType.DYNAMIC, new Vec2(x + 8, y + 40));
  rUpperLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { rUpperLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  rUpperLeg.space = space;

  const lHipP = new PivotJoint(torso, lUpperLeg, new Vec2(-8, 24), new Vec2(0, -16));
  lHipP.space = space;
  const lHipA = new AngleJoint(torso, lUpperLeg, -0.6, 0.6);
  lHipA.space = space;

  const rHipP = new PivotJoint(torso, rUpperLeg, new Vec2(8, 24), new Vec2(0, -16));
  rHipP.space = space;
  const rHipA = new AngleJoint(torso, rUpperLeg, -0.6, 0.6);
  rHipA.space = space;

  // Lower legs
  const lLowerLeg = new Body(BodyType.DYNAMIC, new Vec2(x - 8, y + 72));
  lLowerLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { lLowerLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  lLowerLeg.space = space;

  const rLowerLeg = new Body(BodyType.DYNAMIC, new Vec2(x + 8, y + 72));
  rLowerLeg.shapes.add(new Polygon(Polygon.box(legW, legLen)));
  try { rLowerLeg.userData._colorIdx = colorBase + 1; } catch(_) {}
  rLowerLeg.space = space;

  const lKneeP = new PivotJoint(lUpperLeg, lLowerLeg, new Vec2(0, 16), new Vec2(0, -16));
  lKneeP.space = space;
  const lKneeA = new AngleJoint(lUpperLeg, lLowerLeg, -0.1, Math.PI * 0.5);
  lKneeA.space = space;

  const rKneeP = new PivotJoint(rUpperLeg, rLowerLeg, new Vec2(0, 16), new Vec2(0, -16));
  rKneeP.space = space;
  const rKneeA = new AngleJoint(rUpperLeg, rLowerLeg, -0.1, Math.PI * 0.5);
  rKneeA.space = space;
}

export default {
  id: "ragdoll",
  label: "Ragdoll",
  tags: ["PivotJoint", "AngleJoint", "Character", "Click"],
  featured: true,
  featuredOrder: 7,
  desc: 'Ragdoll figures built from <code>PivotJoint</code> and <code>AngleJoint</code> constraints. <b>Click</b> to spawn a new ragdoll at the cursor.',
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    spawnRagdoll(space, W / 2, 120, 0);
    spawnRagdoll(space, W / 2 - 150, 80, 2);
    spawnRagdoll(space, W / 2 + 150, 60, 4);
  },

  click(x, y, space, W, H) {
    spawnRagdoll(space, x, y, Math.floor(Math.random() * 6));
  },
};
