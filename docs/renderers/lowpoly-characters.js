/**
 * lowpoly-characters.js — procedural low-poly humanoid figures for the
 * three.js demo renderer.
 *
 * Demos drive physics with plain nape bodies (a puck, a ragdoll bone chain).
 * This module draws a *character* on top of one of those bodies without the
 * physics knowing about it: you hide the raw body mesh (`userData._hidden3d`)
 * and call `syncCharacter()` each frame with the state the demo already
 * tracks — position, facing, whether the figure is running.
 *
 * Everything is built from THREE primitives, so there is no asset to load,
 * no licence to track and no rigging step. A figure is ~10 meshes.
 *
 * One rig kind so far:
 *   - "topdown" — a single physics body (a puck) carries the figure, and the
 *                 whole pose is procedural: a run cycle driven by distance
 *                 travelled, plus a lean into the direction of movement.
 *                 Used by the kickoff demo. A "ragdoll" kind, where one body
 *                 per limb makes the physics itself the animation, is the
 *                 obvious next one but is not implemented yet.
 *
 * Coordinate note: the demo camera sits on +Z looking down at the X/-Y plane,
 * so a top-down pitch fills the screen and +Z is "up" out of it, toward the
 * viewer. The rig is therefore built with its parts stacked in Z — legs
 * lowest, head highest — and its limbs sliding fore and aft in that plane.
 * Inside the root group +Y is the way the character faces.
 *
 * The one non-obvious consequence: seen from directly above, the head covers
 * the middle of the torso, so the shirt is built *wider than the skull* — the
 * team colour has to read from the shoulder band on either side of the face,
 * or every figure just looks like a head.
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/**
 * One skin tone and one hair colour for every figure. Varying them per player
 * was tried and dropped: at demo zoom the variation reads as noise rather than
 * as different people, and it competes with the shirt — which is the only
 * colour that has to carry information here (which team you are on).
 */
const SKIN = 0xe8b48a;
const HAIR = 0x2b2118;
const EYE = 0x14181d;

const DEFAULT_PALETTE = {
  shirt: 0x58a6ff,
  shorts: 0x1f2937,
  // Near-black boots read as a detached dark blob from overhead, and get
  // mistaken for hair on the wrong end of the figure. A mid grey keeps the
  // foot attached to the leg visually.
  shoes: 0x4a5058,
  skin: SKIN,
  hair: HAIR,
  eye: EYE,
};

/** Build a palette from a team colour. The shirt is the only thing that varies. */
export function teamPalette(shirtHex, _index = 0, overrides = {}) {
  return {
    ...DEFAULT_PALETTE,
    shirt: shirtHex,
    shorts: darken(shirtHex, 0.55),
    ...overrides,
  };
}

function darken(hex, k) {
  const r = Math.round(((hex >> 16) & 0xff) * k);
  const g = Math.round(((hex >> 8) & 0xff) * k);
  const b = Math.round((hex & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
// Mesh construction
// ---------------------------------------------------------------------------

function mat(THREE, color, { flat = true } = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: flat });
}

function box(THREE, w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(THREE, color));
}

/**
 * Build a top-down humanoid.
 *
 * The figure is assembled inside a root Group whose local axes are:
 *   +X = the character's right, +Y = forward (the way it faces), +Z = up.
 * The caller only ever sets the root's position and its Z rotation, so the
 * rig's internals never have to know about the scene's flipped Y.
 *
 * Seen from the demo camera (straight down -Z) this reads as a figure viewed
 * from above: the head sits highest and hides most of the torso, the shoulders
 * frame it, and the limbs slide fore and aft past the body. Height (+Z) is what
 * gives the silhouette its depth, so the parts are stacked in Z and kept
 * *thin* in Y — a tall box would be seen end-on and read as a blob.
 *
 * @returns {{root: object, parts: object}} root group + named part references
 */
function buildTopDown(THREE, unit, palette) {
  const root = new THREE.Group();
  const parts = {};

  const u = unit;

  // Z layering, ground (0) upward. Each layer is a slab; the camera sees the
  // topmost one of any overlapping pair, so the order sets what reads.
  const legZ = u * 0.30;      // legs: lowest, mostly hidden under the torso
  const torsoZ = u * 0.62;
  const armZ = u * 0.72;      // arms just above the torso so they stay visible
  const headZ = u * 1.10;     // head on top — the dominant shape from above

  // --- Legs -----------------------------------------------------------------
  // A leg is a Group pivoted at the hip, holding a limb centred on that pivot
  // rather than sticking out in front of it. Seen from directly above, a
  // stride is the foot moving *fore and aft past the hip* — so the run cycle
  // slides these groups along Y. (Rotation is the wrong tool here: about X it
  // lifts the limb toward the camera, which barely reads from overhead, and
  // about Z it sweeps the limb sideways, which reads as a scissor kick.)
  const hipX = u * 0.26;
  const legLen = u * 0.58;
  for (const side of ["left", "right"]) {
    const hip = new THREE.Group();
    hip.position.set(side === "left" ? -hipX : hipX, 0, legZ);

    const leg = box(THREE, u * 0.30, legLen, u * 0.34, palette.skin);
    hip.add(leg);

    const shoe = box(THREE, u * 0.32, u * 0.26, u * 0.30, palette.shoes);
    shoe.position.y = legLen * 0.5 + u * 0.08;
    hip.add(shoe);

    root.add(hip);
    parts[side + "Leg"] = hip;
  }

  // --- Torso ----------------------------------------------------------------
  // From straight above the head covers the middle of the torso, so the shirt
  // has to be *wider than the skull* or the team colour disappears under it.
  // The shoulder slab is deliberately broad in X and sits just under the head:
  // the colour then reads as a band on either side of the face, which is what
  // makes blue-vs-red legible at demo zoom.
  const torso = box(THREE, u * 1.16, u * 0.70, u * 0.62, palette.shirt);
  torso.position.set(0, 0, torsoZ);
  root.add(torso);
  parts.torso = torso;

  // Shorts: a darker slab at the base of the torso, peeking out behind it.
  const shorts = box(THREE, u * 0.80, u * 0.66, u * 0.34, palette.shorts);
  shorts.position.set(0, -u * 0.10, legZ + u * 0.16);
  root.add(shorts);
  parts.shorts = shorts;

  // --- Arms -----------------------------------------------------------------
  // Pivoted at the shoulder and centred on it, like the legs, so the same
  // fore/aft slide drives them.
  const shoulderX = u * 0.66;
  const armLen = u * 0.56;
  for (const side of ["left", "right"]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side === "left" ? -shoulderX : shoulderX, 0, armZ);

    const arm = box(THREE, u * 0.24, armLen, u * 0.26, palette.skin);
    shoulder.add(arm);

    // Sleeve in the shirt colour, at the shoulder end of the arm.
    const sleeve = box(THREE, u * 0.30, armLen * 0.40, u * 0.30, palette.shirt);
    sleeve.position.y = -armLen * 0.28;
    shoulder.add(sleeve);

    root.add(shoulder);
    parts[side + "Arm"] = shoulder;
  }

  // --- Head -----------------------------------------------------------------
  // Skull, hair and eyes live in one Group pivoted at the neck. They have to
  // move as a unit — rotating them individually about their own centres pulls
  // the face apart, and the pivot has to be the neck so a bowed head swings
  // forward instead of spinning on the spot.
  const headR = u * 0.31;
  const neck = new THREE.Group();
  neck.position.set(0, 0, headZ - u * 0.22);
  root.add(neck);
  parts.neck = neck;

  const head = box(THREE, headR * 2, headR * 2, u * 0.44, palette.skin);
  head.position.set(0, u * 0.02, u * 0.22);
  neck.add(head);
  parts.head = head;

  // Hair: a thin crescent over the back third of the skull only. A full cap
  // reads as a dark lid from above and swallows the face; leaving most of the
  // scalp bare keeps the head legible as a head, and the crescent is the cue
  // that tells you which way the figure is running.
  const hair = box(THREE, headR * 2.04, headR * 0.72, u * 0.10, palette.hair);
  hair.position.set(0, u * 0.02 - headR * 0.66, u * 0.22 + u * 0.24);
  neck.add(hair);
  parts.hair = hair;

  // Eyes: two dark pips on the forward (+Y) edge of the skull, sitting a hair
  // proud of it so they are never z-fought away. They are the cheapest possible
  // "this is a person, and it is looking that way" cue — with the hair behind,
  // the head reads as a face from directly above.
  const eyeR = headR * 0.30;
  for (const side of ["left", "right"]) {
    const eye = box(THREE, eyeR, eyeR * 0.8, u * 0.10, palette.eye);
    eye.position.set(
      side === "left" ? -headR * 0.42 : headR * 0.42,
      u * 0.02 + headR * 0.74,
      u * 0.22 + u * 0.20,
    );
    neck.add(eye);
    parts[side + "Eye"] = eye;
  }

  // The animation needs the limb groups' rest positions; hand them over rather
  // than let syncCharacter hardcode copies that can drift out of step.
  parts.legZ = legZ;
  parts.armX = shoulderX;
  parts.neckZ = neck.position.z;

  return { root, parts };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a character and add it to the adapter's scene.
 *
 * The returned handle carries its own animation state; pass it back to
 * `syncCharacter()` every frame.
 *
 * @param {object} adapter  ThreeJSAdapter instance (needs addSceneMesh)
 * @param {object} THREE    the three.js module (from adapter.getThree?.() or getThree())
 * @param {object} opts
 * @param {number} opts.unit      character scale — usually the physics radius
 * @param {object} opts.palette   from teamPalette()
 * @param {string} [opts.kind]    "topdown" (default)
 * @returns {object} character handle
 */
export function createCharacter(adapter, THREE, { unit = 15, palette = DEFAULT_PALETTE, kind = "topdown" } = {}) {
  if (kind !== "topdown") {
    throw new Error(`lowpoly-characters: unknown rig kind "${kind}"`);
  }
  const { root, parts } = buildTopDown(THREE, unit, palette);
  adapter.addSceneMesh(root);
  return {
    kind,
    root,
    parts,
    unit,
    palette,
    // Animation state
    phase: 0,      // run-cycle phase in radians
    lastX: null,   // previous world position, for distance-driven stride
    lastY: null,
    lean: 0,       // smoothed lean into the direction of travel
    amp: 0,        // smoothed run-cycle amplitude (0 = standing)
    bob: 0,
  };
}

/** Remove a character from the scene and free its geometry. */
export function destroyCharacter(adapter, ch) {
  if (!ch?.root) return;
  adapter.removeSceneMesh(ch.root);
  ch.root = null;
}

/**
 * Drive a top-down character from the state a demo already tracks.
 *
 * The run cycle advances with *distance travelled*, not with time, so the
 * stride stays locked to the movement: a stationary figure stands still, a
 * sprinting one cycles faster, and slow-motion or a paused space never
 * produces skating feet.
 *
 * @param {object} ch     handle from createCharacter()
 * @param {object} state
 * @param {number} state.x        world x
 * @param {number} state.y        world y (unflipped — this function flips it)
 * @param {number} state.faceX    facing unit vector x
 * @param {number} state.faceY    facing unit vector y
 * @param {boolean} [state.sprinting]
 * @param {number} [state.z]      extra height off the ground
 */
/**
 * Pose a character for a goal celebration or a conceded goal.
 *
 * Both are driven by `moodT`, a seconds-ish clock the caller advances; nothing
 * here reads the physics, so a celebrating player keeps sliding wherever the
 * simulation puts them.
 *
 * The hard part is that a vertical jump is close to invisible from a top-down
 * camera — the figure just sits there. So the celebration sells height the way
 * a 2D game would: the body scales up as it rises (reading as "closer to the
 * camera"), the arms fly out and up, and a shadow-like squash on landing gives
 * the bounce its timing.
 */
function applyMood(ch, { x, y, faceX, faceY, z, mood, moodT }) {
  const u = ch.unit;
  ch.root.position.set(x, -y, z);
  ch.root.rotation.z = Math.atan2(-faceY, faceX) - Math.PI / 2;

  if (mood === "celebrate") {
    // Three hops, each faster and lower than the last.
    const hop = Math.abs(Math.sin(moodT * 7.5));
    const decay = Math.max(0.35, 1 - moodT * 0.25);
    const lift = hop * decay;

    // Scale is the height cue — a jump straight up is nearly invisible from
    // overhead, so the figure has to visibly grow to read as leaving the
    // ground. This is the whole trick, so it is not subtle.
    const sc = 1 + lift * 0.55;
    ch.root.scale.set(sc, sc, sc);
    ch.root.position.z = z + lift * u * 1.2;

    // Arms flung wide and forward — the classic goal run. The spread is capped
    // well under an arm's length: push it further and the limbs visibly detach
    // from the shoulders, which reads as the figure coming apart rather than
    // celebrating.
    const spread = lift * u * 0.34;
    ch.parts.leftArm.position.y = spread * 0.8;
    ch.parts.rightArm.position.y = spread * 0.8;
    ch.parts.leftArm.position.x = -ch.parts.armX - spread * 0.55;
    ch.parts.rightArm.position.x = ch.parts.armX + spread * 0.55;

    // Legs tuck up and together mid-hop.
    ch.parts.leftLeg.position.y = -lift * u * 0.16;
    ch.parts.rightLeg.position.y = lift * u * 0.16;
    ch.parts.leftLeg.position.z = ch.parts.legZ + lift * u * 0.12;
    ch.parts.rightLeg.position.z = ch.parts.legZ + lift * u * 0.12;

    ch.parts.torso.rotation.x = 0;
    ch.parts.neck.rotation.x = 0;
    ch.parts.neck.position.y = 0;
    ch.parts.neck.position.z = ch.parts.neckZ;
    return;
  }

  // Dejected. The instinct is to bow the head, but from a camera looking
  // straight down a bowed head does not read as "looking down" — it simply
  // disappears behind the torso, and the figure loses its face entirely.
  //
  // So the slump is built from cues that survive an overhead view: the head
  // retreats *back* between the shoulders (turtling), the whole figure
  // shrinks and sinks, the shoulders round inward, and it all breathes with a
  // slow sigh. The face stays visible throughout — a sad figure you can still
  // see is worth more than an anatomically-correct one you cannot.
  const sag = 0.72 + Math.sin(moodT * 1.7) * 0.28;

  const sc = 1 - 0.13 * sag;
  ch.root.scale.set(sc, sc, sc);
  ch.root.position.z = z - u * 0.16 * sag;

  // Head sinks backward and downward — pulled in, not tipped over.
  ch.parts.neck.rotation.x = -0.30 * sag;
  ch.parts.neck.position.y = -u * 0.16 * sag;
  ch.parts.neck.position.z = ch.parts.neckZ - u * 0.14 * sag;

  // Shoulders round forward and inward: arms drawn across the body, hanging
  // slightly behind it.
  const droop = -u * 0.22 * sag;
  ch.parts.leftArm.position.y = droop;
  ch.parts.rightArm.position.y = droop;
  ch.parts.leftArm.position.x = -ch.parts.armX * (1 - 0.30 * sag);
  ch.parts.rightArm.position.x = ch.parts.armX * (1 - 0.30 * sag);

  ch.parts.torso.rotation.x = -0.20 * sag;

  // Feet together.
  ch.parts.leftLeg.position.y = 0;
  ch.parts.rightLeg.position.y = 0;
  ch.parts.leftLeg.position.z = ch.parts.legZ;
  ch.parts.rightLeg.position.z = ch.parts.legZ;
}


export function syncCharacter(ch, {
  x, y, faceX = 0, faceY = 1, sprinting = false, z = 0, mood = null, moodT = 0,
}) {
  if (!ch?.root) return;

  // A mood overrides the locomotion pose entirely — a celebrating player is
  // not also mid-stride. Handled first so the run cycle below is skipped.
  if (mood === "celebrate" || mood === "dejected") {
    applyMood(ch, { x, y, faceX, faceY, z, mood, moodT });
    return;
  }

  // --- Stride: advance the cycle by the distance walked this frame ----------
  const dist = ch.lastX === null ? 0 : Math.hypot(x - ch.lastX, y - ch.lastY);
  // One full two-step cycle per ~1.9 character units of travel.
  ch.phase += (dist / (ch.unit * 1.9)) * Math.PI * 2;
  ch.lastX = x;
  ch.lastY = y;

  // --- Root placement -------------------------------------------------------
  // Scene Y is mirrored, so the facing angle is negated along with the position.
  ch.root.position.set(x, -y, z);
  // atan2(-faceY, faceX) is the facing angle in scene space; the rig is built
  // pointing along +Y, hence the -90° correction.
  ch.root.rotation.z = Math.atan2(-faceY, faceX) - Math.PI / 2;

  // --- Run cycle ------------------------------------------------------------
  // Amplitude falls to zero when the figure stops, so a standing character
  // settles into a neutral pose instead of marching in place.
  const target = Math.min(1, dist / (ch.unit * 0.05));
  ch.amp += (target - ch.amp) * 0.22;

  const amp = ch.amp * (sprinting ? 1.25 : 1);

  // A stride, seen from directly above, is the foot travelling fore and aft
  // past the hip — so the limb groups SLIDE along their local +Y (the facing
  // axis) rather than rotating. Rotation was tried both ways and neither
  // reads: about X the limb tips toward the camera and the ground-plane
  // motion nearly vanishes, about Z it sweeps sideways into a scissor.
  const stride = Math.sin(ch.phase) * ch.unit * 0.42 * amp;

  ch.parts.leftLeg.position.y = stride;
  ch.parts.rightLeg.position.y = -stride;
  // Arms counter-swing the legs, and a sprinting figure pumps them harder.
  const armStride = stride * (sprinting ? 1.15 : 0.9);
  ch.parts.leftArm.position.y = -armStride;
  ch.parts.rightArm.position.y = armStride;

  // Clear anything a mood pose left behind — without this a celebration ends
  // with the arms still flung wide once play resumes.
  ch.root.scale.set(1, 1, 1);
  ch.parts.leftArm.position.x = -ch.parts.armX;
  ch.parts.rightArm.position.x = ch.parts.armX;

  // A little lift on the trailing foot keeps the stride from looking like a
  // flat shuffle: the leg that is behind rides slightly higher.
  ch.parts.leftLeg.position.z = ch.parts.legZ - Math.min(0, stride) * 0.10;
  ch.parts.rightLeg.position.z = ch.parts.legZ - Math.min(0, -stride) * 0.10;

  // --- Lean + bob -----------------------------------------------------------
  // The lean goes on the torso and head, never on the root: the root already
  // carries the facing as a Z rotation, and adding an X rotation on top of it
  // combines in Three's default XYZ Euler order into a sideways roll — the
  // figure tips over instead of leaning forward.
  const leanTarget = amp * (sprinting ? 0.34 : 0.20);
  ch.lean += (leanTarget - ch.lean) * 0.15;
  ch.parts.torso.rotation.x = ch.lean;
  ch.parts.neck.rotation.x = ch.lean * 0.6;
  ch.parts.neck.position.y = 0;
  ch.parts.neck.position.z = ch.parts.neckZ;

  // Vertical bob at twice the stride frequency (one rise per footfall).
  ch.bob = Math.abs(Math.cos(ch.phase)) * ch.unit * 0.06 * amp;
  ch.root.position.z = z + ch.bob;
}

// ---------------------------------------------------------------------------
// Football
// ---------------------------------------------------------------------------

/**
 * Build a football and add it to the adapter's scene.
 *
 * The classic truncated-icosahedron panelling is painted rather than modelled:
 * an IcosahedronGeometry gives the faceted low-poly silhouette, and a canvas
 * texture supplies the black pentagons. Modelling real panels would cost
 * hundreds of triangles for a ball that is 20px wide on screen.
 *
 * @returns {object} handle with `.mesh`; pass it to syncBall()
 */
export function createFootball(adapter, THREE, { radius = 10 } = {}) {
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 64;
  const c = cv.getContext("2d");
  c.fillStyle = "#f0f3f6";
  c.fillRect(0, 0, cv.width, cv.height);

  // Pentagon-ish blobs in two offset rows — at ball size this reads exactly
  // like a football without any of the spherical-projection fuss.
  c.fillStyle = "#1b2026";
  const spots = [
    [16, 16], [64, 16], [112, 16],
    [40, 48], [88, 48],
  ];
  for (const [x, y] of spots) {
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * 11;
      const py = y + Math.sin(a) * 11;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;

  // detail=1 keeps the faceted look; a smooth sphere loses the low-poly feel.
  const geom = new THREE.IcosahedronGeometry(radius, 1);
  const mesh = new THREE.Mesh(
    geom,
    new THREE.MeshLambertMaterial({ map: tex, flatShading: true }),
  );
  adapter.addSceneMesh(mesh);
  // Keep THREE on the handle so syncBall can build proper Vector3/Quaternion
  // objects instead of duck-typed stand-ins.
  return { mesh, radius, THREE, _axis: new THREE.Vector3(), _q: new THREE.Quaternion() };
}

/** Remove a football from the scene. */
export function destroyFootball(adapter, ball) {
  if (!ball?.mesh) return;
  adapter.removeSceneMesh(ball.mesh);
  ball.mesh = null;
}

/**
 * Place a football and roll it. The ball spins about the axis perpendicular to
 * its travel, at the rate a ball of this radius would actually roll, so the
 * panels turn the right way and at the right speed.
 */
export function syncBall(ball, { x, y, vx = 0, vy = 0 }) {
  if (!ball?.mesh) return;
  ball.mesh.position.set(x, -y, 0);

  const speed = Math.hypot(vx, vy);
  if (speed > 1) {
    // Rolling axis lies in the ground plane, perpendicular to travel. Scene Y
    // is mirrored, so the y component flips with it.
    ball._axis.set(-vy, -vx, 0).normalize();
    // Arc length over radius = angle. Velocity is per second, so one frame of
    // roll at 60fps is speed/60.
    const dTheta = (speed / 60) / ball.radius;
    ball._q.setFromAxisAngle(ball._axis, dTheta);
    ball.mesh.quaternion.premultiply(ball._q);
  }
}

// ---------------------------------------------------------------------------
// Pitch surround
// ---------------------------------------------------------------------------

/**
 * A reusable material for the boards that ring a pitch — the flat grey the
 * debug renderer gives static bodies reads as "untextured placeholder", which
 * is exactly what it is.
 *
 * The texture has to be **square and directionless**. Extruded walls present
 * three different kinds of face (the top slab, the long side, the short end),
 * every one with world-space UVs, and a single material covers them all. A
 * strip design with a "top rail" therefore paints that rail down the sides of
 * some walls and across the top of others, and a non-square canvas stretches
 * whichever axis is short. So this is a plain tiled panel grid: it looks the
 * same whichever way a face is turned.
 */
export function createBoardMaterial(THREE, { tint = 0x2f3b45, worldUnitsPerTile = 26 } = {}) {
  const S = 64;
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d");

  const base = "#" + tint.toString(16).padStart(6, "0");
  c.fillStyle = base;
  c.fillRect(0, 0, S, S);

  // A subtle checker so neighbouring tiles differ slightly — a perfectly
  // uniform panel reads as a flat colour again once it is small on screen.
  c.fillStyle = "rgba(255,255,255,0.045)";
  c.fillRect(0, 0, S / 2, S / 2);
  c.fillRect(S / 2, S / 2, S / 2, S / 2);

  // Grout lines on all four edges, so the tile is symmetric under rotation and
  // the seams line up however two faces meet.
  c.strokeStyle = "rgba(0,0,0,0.42)";
  c.lineWidth = 3;
  c.strokeRect(0, 0, S, S);
  c.beginPath();
  c.moveTo(S / 2, 0); c.lineTo(S / 2, S);
  c.moveTo(0, S / 2); c.lineTo(S, S / 2);
  c.lineWidth = 2;
  c.stroke();

  // Speckle, seeded so the pattern is stable across reloads.
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < 90; i++) {
    c.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    c.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // ExtrudeGeometry hands out UVs in WORLD units rather than 0..1, so the
  // tiling comes for free — the scale factor just says how many world units
  // one tile spans. The texture is square, so both axes take the same value
  // and nothing stretches.
  tex.repeat.set(1 / worldUnitsPerTile, 1 / worldUnitsPerTile);

  return new THREE.MeshPhongMaterial({
    map: tex,
    shininess: 12,
    side: THREE.DoubleSide,
  });
}

