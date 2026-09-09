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
function buildTopDown(THREE, unit, palette, props = {}) {
  const root = new THREE.Group();
  const parts = {};

  const u = unit;
  // `bulk` widens the torso, hips and shoulders without touching the head or
  // the limb lengths — a heavyweight reads as broad, not as tall, from above.
  const bulk = props.bulk ?? 1;

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
  const hipX = u * 0.26 * bulk;
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
  const torso = box(THREE, u * 1.16 * bulk, u * 0.70, u * 0.62, palette.shirt);
  torso.position.set(0, 0, torsoZ);
  root.add(torso);
  parts.torso = torso;

  // Shorts: a darker slab at the base of the torso, peeking out behind it.
  const shorts = box(THREE, u * 0.80 * bulk, u * 0.66, u * 0.34, palette.shorts);
  shorts.position.set(0, -u * 0.10, legZ + u * 0.16);
  root.add(shorts);
  parts.shorts = shorts;

  // --- Arms -----------------------------------------------------------------
  // Pivoted at the shoulder and centred on it, like the legs, so the same
  // fore/aft slide drives them.
  const shoulderX = u * 0.66 * bulk;
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
  parts.headR = headR;
  parts.armLen = armLen;
  parts.torsoZ = torsoZ;

  // Hero dressing — headgear on the neck group, a weapon in one or both hands.
  // Both are optional; a plain footballer passes neither.
  if (props.hat) addTopDownHat(THREE, parts, u, palette, props.hat);
  parts.twoHanded = false;
  if (props.weapon) addTopDownWeapon(THREE, root, parts, u, palette, props.weapon);

  // Materials that take the hit flash. Skin and shirt only — flashing the hat
  // and weapon too turns the figure into one white blob.
  parts.flashMats = [torso.material, head.material, shorts.material];

  return { root, parts };
}

// ---------------------------------------------------------------------------
// Top-down hero dressing
// ---------------------------------------------------------------------------
//
// Everything here hangs off the plain footballer rig. Seen from directly above
// a hat is the single strongest silhouette cue there is — it changes the
// outline of the head, which is the biggest shape on screen — so each hero
// archetype gets a distinct one. Weapons are thin and long so they read as a
// line sticking out of the figure rather than as a second body.

function addTopDownHat(THREE, parts, u, palette, hat) {
  const neck = parts.neck;
  const headR = parts.headR;
  const hatColor = palette.hat ?? darken(palette.shirt, 0.7);
  const accent = palette.accent ?? 0xffd166;
  const headTopZ = u * 0.22 + u * 0.22;   // the skull box spans z 0..0.44u in the neck group
  const fwdY = u * 0.02;                  // the head sits a hair forward of the neck pivot

  const group = new THREE.Group();
  neck.add(group);
  parts.hat = group;

  if (hat === "cowboy") {
    // Wide flat brim plus a squat crown. The brim doubles the head's footprint
    // — unmistakable from above.
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 1.6, headR * 1.6, u * 0.05, 12), mat(THREE, hatColor),
    );
    brim.rotation.x = Math.PI / 2;
    brim.position.set(0, fwdY, headTopZ + u * 0.03);
    group.add(brim);
    const crown = box(THREE, headR * 1.25, headR * 1.35, u * 0.24, hatColor);
    crown.position.set(0, fwdY, headTopZ + u * 0.16);
    group.add(crown);
    const band = box(THREE, headR * 1.3, headR * 1.4, u * 0.06, accent);
    band.position.set(0, fwdY, headTopZ + u * 0.07);
    group.add(band);
  } else if (hat === "bandana") {
    // A band round the brow with a tail out the back. Sits below the eye row
    // so the face stays readable.
    const band = box(THREE, headR * 2.1, headR * 2.1, u * 0.08, hatColor);
    band.position.set(0, fwdY, u * 0.34);
    group.add(band);
    const tail = box(THREE, headR * 0.45, headR * 1.1, u * 0.06, hatColor);
    tail.position.set(headR * 0.3, fwdY - headR * 1.3, u * 0.33);
    tail.rotation.z = -0.35;
    group.add(tail);
  } else if (hat === "mask") {
    // Wrestler's mask: a full cap in the mask colour with a contrasting stripe
    // running fore-and-aft. Covers the hair entirely.
    const cap = box(THREE, headR * 2.06, headR * 2.06, u * 0.12, hatColor);
    cap.position.set(0, fwdY, headTopZ + u * 0.02);
    group.add(cap);
    const stripe = box(THREE, headR * 0.55, headR * 2.1, u * 0.13, accent);
    stripe.position.set(0, fwdY, headTopZ + u * 0.025);
    group.add(stripe);
    const rim = box(THREE, headR * 2.12, headR * 2.12, u * 0.06, accent);
    rim.position.set(0, fwdY, u * 0.30);
    group.add(rim);
  } else if (hat === "sombrero") {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 2.1, headR * 2.1, u * 0.05, 12), mat(THREE, hatColor),
    );
    brim.rotation.x = Math.PI / 2;
    brim.position.set(0, fwdY, headTopZ + u * 0.03);
    group.add(brim);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(headR * 0.95, u * 0.32, 8), mat(THREE, hatColor),
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, fwdY, headTopZ + u * 0.05 + u * 0.16);
    group.add(cone);
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 2.15, headR * 2.15, u * 0.02, 12), mat(THREE, accent),
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.set(0, fwdY, headTopZ + u * 0.065);
    group.add(trim);
  } else if (hat === "goggles") {
    // A strap round the skull and two lenses pushed up on the forehead.
    const band = box(THREE, headR * 2.1, headR * 2.1, u * 0.07, hatColor);
    band.position.set(0, fwdY, u * 0.38);
    group.add(band);
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(headR * 0.3, headR * 0.3, u * 0.08, 10), mat(THREE, accent),
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(side * headR * 0.42, fwdY + headR * 0.55, headTopZ + u * 0.03);
      group.add(lens);
    }
  } else if (hat === "cap") {
    const crown = box(THREE, headR * 1.9, headR * 1.9, u * 0.10, hatColor);
    crown.position.set(0, fwdY, headTopZ + u * 0.02);
    group.add(crown);
    const brim = box(THREE, headR * 1.6, headR * 0.95, u * 0.05, hatColor);
    brim.position.set(0, fwdY + headR * 1.35, headTopZ);
    group.add(brim);
    const button = box(THREE, headR * 0.3, headR * 0.3, u * 0.06, accent);
    button.position.set(0, fwdY, headTopZ + u * 0.09);
    group.add(button);
  }
}

function addTopDownWeapon(THREE, root, parts, u, palette, weapon) {
  const handY = parts.armLen * 0.5;      // the hand end of the arm box
  const gunColor = palette.gun ?? 0x2e3338;
  const accent = palette.accent ?? 0xffd166;
  const wood = palette.wood ?? 0x8a5f33;

  // Weapons hang off a group at the hand so the arm's own slide carries them.
  const hold = (arm) => {
    const g = new THREE.Group();
    g.position.set(0, handY, u * 0.06);
    arm.add(g);
    return g;
  };

  if (weapon === "shotgun") {
    // Long barrel forward of the right hand, wooden stock back along the arm.
    // Two-handed: the left arm reaches across to the pump in syncCharacter.
    const g = hold(parts.rightArm);
    const barrel = box(THREE, u * 0.15, u * 1.15, u * 0.15, gunColor);
    barrel.position.y = u * 0.42;
    g.add(barrel);
    const pump = box(THREE, u * 0.22, u * 0.22, u * 0.18, wood);
    pump.position.y = u * 0.22;
    g.add(pump);
    const stock = box(THREE, u * 0.18, u * 0.34, u * 0.16, wood);
    stock.position.y = -u * 0.18;
    g.add(stock);
    parts.weapon = g;
    parts.twoHanded = true;
  } else if (weapon === "pistols") {
    for (const arm of [parts.leftArm, parts.rightArm]) {
      const g = hold(arm);
      const barrel = box(THREE, u * 0.12, u * 0.52, u * 0.12, gunColor);
      barrel.position.y = u * 0.22;
      g.add(barrel);
      const grip = box(THREE, u * 0.12, u * 0.14, u * 0.2, accent);
      grip.position.set(0, -u * 0.02, -u * 0.08);
      g.add(grip);
    }
    parts.weapon = parts.rightArm.children[parts.rightArm.children.length - 1];
  } else if (weapon === "fists") {
    // Oversized gloves — the weapon IS the hand.
    for (const arm of [parts.leftArm, parts.rightArm]) {
      const g = hold(arm);
      const glove = box(THREE, u * 0.42, u * 0.42, u * 0.42, accent);
      g.add(glove);
    }
    parts.weapon = parts.rightArm.children[parts.rightArm.children.length - 1];
  } else if (weapon === "lute") {
    // Held across the chest in the left hand; the right hand strums it.
    const g = hold(parts.leftArm);
    g.rotation.z = -0.9;
    const body = box(THREE, u * 0.52, u * 0.5, u * 0.16, wood);
    g.add(body);
    const neck = box(THREE, u * 0.11, u * 0.7, u * 0.1, darken(wood, 0.7));
    neck.position.y = u * 0.52;
    g.add(neck);
    const strings = box(THREE, u * 0.2, u * 0.9, u * 0.02, 0xe8e8e8);
    strings.position.set(0, u * 0.2, u * 0.09);
    g.add(strings);
    const hole = box(THREE, u * 0.2, u * 0.2, u * 0.02, 0x1b1410);
    hole.position.set(0, -u * 0.04, u * 0.09);
    g.add(hole);
    parts.weapon = g;
    parts.twoHanded = true;
  } else if (weapon === "bottle") {
    const g = hold(parts.rightArm);
    const flask = new THREE.Mesh(
      new THREE.CylinderGeometry(u * 0.12, u * 0.15, u * 0.38, 8), mat(THREE, accent),
    );
    flask.position.y = u * 0.1;
    g.add(flask);
    const cork = box(THREE, u * 0.1, u * 0.1, u * 0.1, wood);
    cork.position.y = u * 0.33;
    g.add(cork);
    parts.weapon = g;
    // A satchel of spares on the back.
    const satchel = box(THREE, u * 0.56, u * 0.26, u * 0.34, wood);
    satchel.position.set(0, -u * 0.44, parts.torsoZ + u * 0.06);
    root.add(satchel);
  } else if (weapon === "wrench") {
    const g = hold(parts.rightArm);
    const shaft = box(THREE, u * 0.11, u * 0.72, u * 0.11, gunColor);
    shaft.position.y = u * 0.3;
    g.add(shaft);
    const head = box(THREE, u * 0.34, u * 0.14, u * 0.12, gunColor);
    head.position.y = u * 0.7;
    g.add(head);
    for (const side of [-1, 1]) {
      const jaw = box(THREE, u * 0.1, u * 0.16, u * 0.12, gunColor);
      jaw.position.set(side * u * 0.12, u * 0.82, 0);
      g.add(jaw);
    }
    parts.weapon = g;
  }
}

/**
 * Hero-specific pose layer for the top-down rig — the pieces a fighting
 * character needs on top of the footballer's run cycle. Runs after the run
 * cycle has posed the limbs, and overrides what it must.
 */
function applyHeroExtras(ch, { attacking, hit, dead, lift }) {
  const u = ch.unit;
  const p = ch.parts;

  // Attack thrust: a one-frame trigger that decays here, so the demo only has
  // to say "fired" on the frame it happens.
  if (attacking) ch.attack = 1;
  ch.attack *= 0.82;
  if (ch.attack < 0.01) ch.attack = 0;

  if (p.twoHanded) {
    // Both hands on the weapon: arms held forward and inward, no run swing,
    // and the recoil pulls the whole grip back along the facing axis.
    const back = ch.attack * u * 0.18;
    p.rightArm.position.y = u * 0.12 - back;
    p.rightArm.position.x = p.armX * 0.62;
    p.leftArm.position.y = u * 0.30 - back;
    p.leftArm.position.x = -p.armX * 0.22;
  } else if (ch.attack > 0) {
    // One-handed thrust: the right arm punches forward past the run pose.
    p.rightArm.position.y += ch.attack * u * 0.36;
    if (p.weapon && p.weapon.parent === p.leftArm) {
      p.leftArm.position.y += ch.attack * u * 0.36;
    } else if (ch.props?.weapon === "pistols") {
      p.leftArm.position.y += ch.attack * u * 0.30;
    }
  }
  // A little forward lunge of the torso on every attack.
  p.torso.rotation.x += ch.attack * 0.25;

  // Hit flash: skin and shirt go white for a few frames.
  if (hit) ch.hitT = 4;
  const flashOn = ch.hitT > 0;
  if (flashOn) ch.hitT--;
  if (flashOn !== ch.flashOn) {
    ch.flashOn = flashOn;
    for (const m of p.flashMats) m.emissive.setScalar(flashOn ? 0.85 : 0);
  }

  // Height cue: a perspective camera already makes a lifted figure larger, so
  // this is only a small boost to sell a leap that is mostly vertical.
  if (lift !== 1) ch.root.scale.multiplyScalar(lift);

  // Death: from above, a figure that spins down into nothing reads as "gone"
  // far better than a topple, which just turns the silhouette into a smear.
  if (dead > 0) {
    const k = Math.min(1, dead);
    const s = Math.max(0.001, 1 - k * k);
    ch.root.scale.set(s, s, s);
    ch.root.rotation.z += k * 7;
    ch.root.position.z += k * u * 0.8;
  }
}

/**
 * Palette for a top-down hero: shirt colour plus the accent colours the hat and
 * weapon builders read. Anything not given falls back to a sensible derivative.
 */
export function heroPalette(shirtHex, overrides = {}) {
  return {
    ...DEFAULT_PALETTE,
    shirt: shirtHex,
    shorts: darken(shirtHex, 0.55),
    hat: darken(shirtHex, 0.7),
    accent: 0xffd166,
    gun: 0x2e3338,
    wood: 0x8a5f33,
    ...overrides,
  };
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
/**
 * @param {object} [opts.props]   hero dressing — `{ weapon, hat, bulk }`.
 *        weapon: "shotgun" | "pistols" | "fists" | "lute" | "bottle" | "wrench"
 *        hat:    "cowboy" | "bandana" | "mask" | "sombrero" | "goggles" | "cap"
 *        bulk:   torso/shoulder width multiplier (1 = the footballer)
 */
export function createCharacter(
  adapter, THREE, { unit = 15, palette = DEFAULT_PALETTE, kind = "topdown", props = null } = {},
) {
  if (kind !== "topdown") {
    throw new Error(`lowpoly-characters: unknown rig kind "${kind}"`);
  }
  const { root, parts } = buildTopDown(THREE, unit, palette, props || {});
  adapter.addSceneMesh(root);
  return {
    kind,
    root,
    parts,
    unit,
    palette,
    props: props || null,
    // Animation state
    phase: 0,      // run-cycle phase in radians
    lastX: null,   // previous world position, for distance-driven stride
    lastY: null,
    lean: 0,       // smoothed lean into the direction of travel
    amp: 0,        // smoothed run-cycle amplitude (0 = standing)
    bob: 0,
    // Hero extras (see applyHeroExtras)
    attack: 0,
    hitT: 0,
    flashOn: false,
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


/**
 * Hero extras (all optional, ignored by a plain footballer):
 * @param {boolean} [state.attacking]  true on the frame an attack fires
 * @param {boolean} [state.hit]        true on the frame damage lands
 * @param {number}  [state.dead]       0..1 death animation progress
 * @param {number}  [state.lift]       extra uniform scale (height cue for a leap)
 */
export function syncCharacter(ch, {
  x, y, faceX = 0, faceY = 1, sprinting = false, z = 0, mood = null, moodT = 0,
  attacking = false, hit = false, dead = 0, lift = 1,
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

  // Weapon grip, attack thrust, hit flash, leap lift, death — only figures
  // built with `props` (or handed these fields) ever take this path.
  if (ch.props || attacking || hit || dead > 0 || lift !== 1) {
    applyHeroExtras(ch, { attacking, hit, dead, lift });
  }
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


// ---------------------------------------------------------------------------
// Side-view rig
// ---------------------------------------------------------------------------
//
// The "sideview" rig is a second, independent character kind for demos whose
// camera looks straight down -Z at a *vertical* plane — a platformer or a
// run-and-gun shooter — rather than at a floor. Almost none of the top-down
// rig's reasoning carries over, so the two share only the palette:
//
//   - Depth is now toward the viewer, and the silhouette is what reads. Parts
//     are therefore stacked in X/Y (the screen plane) and kept *thin in Z*,
//     the exact opposite of the top-down rig.
//   - A stride is a limb SWINGING about the hip, and from the side that swing
//     is fully visible — so the legs rotate (about Z) instead of sliding.
//   - Facing is a mirror, not a rotation: the figure faces left or right, and
//     turning it is a sign flip on the root's X scale. Rotating it would spin
//     it edge-on and it would vanish.
//   - The aim arm is driven by an absolute angle from the demo, so the gun
//     points wherever the player is aiming independently of which way the
//     body faces. That decoupling is the whole point of the rig.
//
// Layering along +Z (toward the camera), back to front:
//   far limbs (-Z) → torso/head (0) → near limbs (+Z) → gun (+Z most)
// so a swinging arm never disappears into the chest.

// One full two-step cycle per this many character units of travel. Tuned so a
// figure moving at a run reads as ~2-3 steps a second rather than a blur.
const STRIDE_UNITS = 4.8;

const SOLDIER_PALETTE = {
  shirt: 0x3f6f4a,      // fatigues
  shorts: 0x2b4a33,
  shoes: 0x2a2622,
  skin: SKIN,
  hair: HAIR,
  eye: EYE,
  gun: 0x2e3338,
  gunAccent: 0x6b5334,  // wooden stock/grip
  headband: 0xc23b3b,
};

/**
 * Palette for a side-view fighter. `tint` recolours the fatigues; everything
 * else keeps the soldier defaults unless overridden.
 */
export function soldierPalette(tint, overrides = {}) {
  return {
    ...SOLDIER_PALETTE,
    shirt: tint,
    shorts: darken(tint, 0.62),
    ...overrides,
  };
}

/**
 * Build a side-facing humanoid holding a gun.
 *
 * Local axes inside the root group: +X = the direction the figure faces,
 * +Y = up, +Z = toward the camera. The caller sets the root's position and
 * flips `scale.x` to face the other way; the rig's internals never see the
 * scene's mirrored Y.
 *
 * @returns {{root: object, parts: object}}
 */
function buildSideView(THREE, unit, palette) {
  const root = new THREE.Group();
  const parts = {};
  const u = unit;

  // Z depth of each layer. Thin slabs, ordered so near limbs occlude the torso
  // and far limbs hide behind it.
  const farZ = -u * 0.30;
  const nearZ = u * 0.30;
  const limbD = u * 0.22;

  // Body proportions, measured up from the feet at y = 0. The physics body is
  // a capsule whose centre is the origin, so everything is finally shifted
  // down by `hipY + legLen` in syncSoldier — building from the ground up is
  // simply easier to reason about.
  const legLen = u * 0.78;
  const hipY = legLen;                 // hip pivot height
  const torsoH = u * 0.80;
  const torsoY = hipY + torsoH * 0.5;
  const shoulderY = hipY + torsoH * 0.86;
  const headR = u * 0.30;

  // --- Legs -----------------------------------------------------------------
  // A hip Group pivoted at the joint, with the limb hanging *below* it, so a
  // rotation about Z swings the foot fore and aft — the read of a run seen
  // from the side. `far` is drawn behind the torso, `near` in front.
  for (const side of ["far", "near"]) {
    const z = side === "far" ? farZ : nearZ;
    const hip = new THREE.Group();
    hip.position.set(0, hipY, z);

    const thigh = box(THREE, u * 0.28, legLen, limbD, palette.shorts);
    thigh.position.y = -legLen * 0.5;
    hip.add(thigh);

    // A knee group so the shin can bend independently — a straight-legged
    // jump tuck reads as a mannequin being lifted rather than a person.
    const knee = new THREE.Group();
    knee.position.y = -legLen;
    hip.add(knee);

    const shin = box(THREE, u * 0.26, legLen * 0.62, limbD * 0.95, palette.skin);
    shin.position.y = -legLen * 0.31;
    knee.add(shin);

    const boot = box(THREE, u * 0.42, u * 0.20, limbD * 1.15, palette.shoes);
    // The boot juts forward of the ankle so the foot has a toe, which is what
    // sells the direction of travel in a silhouette.
    boot.position.set(u * 0.07, -legLen * 0.62 - u * 0.08, 0);
    knee.add(boot);

    root.add(hip);
    parts[side + "Leg"] = hip;
    parts[side + "Knee"] = knee;
  }

  // --- Torso ----------------------------------------------------------------
  const torso = box(THREE, u * 0.56, torsoH, u * 0.46, palette.shirt);
  torso.position.set(0, torsoY, 0);
  root.add(torso);
  parts.torso = torso;

  // Webbing strap across the chest — a single light diagonal is the cheapest
  // way to stop a plain box reading as a box.
  const strap = box(THREE, u * 0.14, torsoH * 0.92, u * 0.50, darken(palette.shirt, 0.5));
  strap.position.set(-u * 0.04, torsoY, 0);
  strap.rotation.z = 0.32;
  root.add(strap);
  parts.strap = strap;

  // --- Head -----------------------------------------------------------------
  const neck = new THREE.Group();
  neck.position.set(0, shoulderY + u * 0.10, 0);
  root.add(neck);
  parts.neck = neck;

  const head = box(THREE, headR * 1.75, headR * 2, headR * 1.9, palette.skin);
  head.position.y = headR * 0.85;
  neck.add(head);
  parts.head = head;

  // Hair at the back of the skull only — from the side the profile is the
  // silhouette, so hair over the whole head just squares it off.
  const hair = box(THREE, headR * 0.85, headR * 1.5, headR * 1.95, palette.hair);
  hair.position.set(-headR * 0.62, headR * 1.0, 0);
  neck.add(hair);
  parts.hair = hair;

  // Headband — the one flourish that reads at demo zoom and says "action hero"
  // rather than "generic box man".
  if (palette.headband != null) {
    const band = box(THREE, headR * 1.85, headR * 0.34, headR * 2.0, palette.headband);
    band.position.y = headR * 1.42;
    neck.add(band);
    parts.headband = band;

    // Two tails trailing behind the band, offset in Z so they don't merge into
    // one slab. They get whipped by movement in syncSoldier.
    for (const [i, name] of ["bandTailA", "bandTailB"].entries()) {
      const tail = new THREE.Group();
      tail.position.set(-headR * 0.85, headR * 1.40, (i ? -1 : 1) * headR * 0.42);
      const strip = box(THREE, headR * 1.5, headR * 0.22, headR * 0.20, palette.headband);
      strip.position.x = -headR * 0.75;
      tail.add(strip);
      neck.add(tail);
      parts[name] = tail;
    }
  }

  // Eye: a single dark pip on the forward face. In profile you only ever see
  // one, and drawing two makes the head look transparent.
  const eye = box(THREE, headR * 0.26, headR * 0.30, headR * 2.05, palette.eye);
  eye.position.set(headR * 0.55, headR * 0.95, 0);
  neck.add(eye);
  parts.eye = eye;

  // --- Arms -----------------------------------------------------------------
  // The far arm swings with the run cycle. The near arm is the AIM arm: it is
  // rotated to an absolute angle by the demo and carries the gun, so it never
  // takes part in the run cycle at all.
  const armLen = u * 0.62;

  const farArm = new THREE.Group();
  farArm.position.set(0, shoulderY, farZ - u * 0.06);
  const farLimb = box(THREE, u * 0.24, armLen, limbD, palette.shirt);
  farLimb.position.y = -armLen * 0.5;
  farArm.add(farLimb);
  const farHand = box(THREE, u * 0.24, u * 0.20, limbD, palette.skin);
  farHand.position.y = -armLen * 0.92;
  farArm.add(farHand);
  root.add(farArm);
  parts.farArm = farArm;

  const aimArm = new THREE.Group();
  aimArm.position.set(u * 0.06, shoulderY, nearZ + u * 0.10);
  const aimLimb = box(THREE, armLen, u * 0.24, limbD, palette.shirt);
  // Built along +X (pointing forward) rather than hanging down: the aim angle
  // is then simply the group's Z rotation, with zero meaning "aiming straight
  // ahead", which is what the demo's aim vector already gives.
  aimLimb.position.x = armLen * 0.5;
  aimArm.add(aimLimb);
  const aimHand = box(THREE, u * 0.22, u * 0.24, limbD * 1.1, palette.skin);
  aimHand.position.x = armLen * 0.95;
  aimArm.add(aimHand);
  parts.aimArm = aimArm;
  root.add(aimArm);

  // --- Gun ------------------------------------------------------------------
  // Parented to the aim arm, so it inherits the aim angle for free.
  const gun = new THREE.Group();
  gun.position.x = armLen * 0.95;
  aimArm.add(gun);
  parts.gun = gun;

  const barrel = box(THREE, u * 0.95, u * 0.13, u * 0.16, palette.gun);
  barrel.position.x = u * 0.48;
  gun.add(barrel);

  const body = box(THREE, u * 0.40, u * 0.26, u * 0.19, palette.gun);
  body.position.set(u * 0.05, -u * 0.02, 0);
  gun.add(body);

  const stock = box(THREE, u * 0.34, u * 0.22, u * 0.17, palette.gunAccent);
  stock.position.set(-u * 0.22, -u * 0.06, 0);
  stock.rotation.z = -0.12;
  gun.add(stock);

  const mag = box(THREE, u * 0.16, u * 0.30, u * 0.15, palette.gun);
  mag.position.set(u * 0.02, -u * 0.24, 0);
  mag.rotation.z = 0.18;
  gun.add(mag);

  // Muzzle flash — a permanent mesh toggled with `.visible`, so firing costs
  // no allocation. Two crossed quads read as a flash from any angle.
  const flash = new THREE.Group();
  flash.position.x = u * 0.98;
  flash.visible = false;
  for (let i = 0; i < 2; i++) {
    const q = new THREE.Mesh(
      new THREE.PlaneGeometry(u * 0.7, u * 0.42),
      new THREE.MeshBasicMaterial({
        color: 0xffd980,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    q.rotation.x = i * Math.PI / 2;
    flash.add(q);
  }
  gun.add(flash);
  parts.flash = flash;

  // Rest-pose values the animation needs, handed over rather than duplicated.
  parts.hipY = hipY;
  parts.legLen = legLen;
  parts.shoulderY = shoulderY;
  parts.torsoY = torsoY;
  parts.headR = headR;
  parts.armLen = armLen;

  // Where the soles actually are, measured through the chain that puts them
  // there: hip (y = hipY) → knee (−legLen) → boot centre → half the boot.
  // They are NOT at local y = 0 — the boot hangs well below the knee — and
  // assuming they were is what buried the feet in the floor.
  const bootCentreY = (hipY - legLen) + (-legLen * 0.62 - u * 0.08);
  parts.soleY = bootCentreY - u * 0.20 * 0.5;
  parts.crownY = shoulderY + u * 0.10 + headR * 2.0;
  // True standing height, sole to crown.
  parts.standHeight = parts.crownY - parts.soleY;

  return { root, parts };
}

/**
 * Create a side-view soldier and add it to the adapter's scene.
 *
 * @param {object} opts
 * @param {number} opts.unit       character scale (roughly half the body height)
 * @param {object} opts.palette    from soldierPalette()
 * @returns {object} handle for syncSoldier()
 */
/**
 * @param {number} [opts.bodyHeight]  the collider height this figure stands in
 *        for. The rig is uniformly scaled so its sole-to-crown height matches,
 *        which is what keeps the feet on the floor; omit it and the rig keeps
 *        its natural proportions.
 */
export function createSoldier(
  adapter, THREE, { unit = 18, palette = SOLDIER_PALETTE, bodyHeight = null } = {},
) {
  const { root, parts } = buildSideView(THREE, unit, palette);
  // The rig's natural height is ~2.8 units, not the `unit` itself, so a figure
  // built for an 18px unit stands 52px tall. Scale it to the collider it
  // represents rather than hoping the two happen to agree.
  const fit = bodyHeight != null ? bodyHeight / parts.standHeight : 1;
  root.scale.setScalar(fit);
  adapter.addSceneMesh(root);
  return {
    kind: "sideview",
    root,
    parts,
    unit,
    fit,
    palette,
    phase: 0,
    lastX: null,
    amp: 0,
    face: 1,
    lastFaceSign: 1,
    aim: 0,
    recoil: 0,
    flashT: 0,
    hitT: 0,
  };
}

/** Remove a soldier from the scene. */
export function destroySoldier(adapter, ch) {
  if (!ch?.root) return;
  adapter.removeSceneMesh(ch.root);
  ch.root = null;
}

/**
 * Drive a side-view soldier from the state a demo already tracks.
 *
 * As with the top-down rig the run cycle advances with distance travelled, so
 * a body frozen by a pause or a knockback never moonwalks.
 *
 * @param {object} state
 * @param {number} state.x         world x (body centre)
 * @param {number} state.y         world y, unflipped — this function flips it
 * @param {number} state.face      +1 facing right, -1 facing left
 * @param {number} state.aim       aim angle in WORLD space (radians, +y down)
 * @param {boolean} [state.grounded]
 * @param {number} [state.vy]      world vertical velocity (+ = falling)
 * @param {boolean} [state.crouching]
 * @param {boolean} [state.firing] true on the frame a shot leaves the gun
 * @param {number} [state.dead]    0..1 death/ragdoll blend
 */
export function syncSoldier(ch, {
  x, y, face = 1, aim = 0, grounded = true, vy = 0,
  crouching = false, firing = false, dead = 0, bodyHeight = null,
}) {
  if (!ch?.root) return;
  const u = ch.unit;
  const p = ch.parts;

  // --- Stride ---------------------------------------------------------------
  const dist = ch.lastX === null ? 0 : Math.abs(x - ch.lastX);
  ch.lastX = x;
  // One full two-step cycle per STRIDE_UNITS of travel. At u≈18 that is a
  // stride every ~86px: a runner at 210px/s takes about 2.4 steps a second,
  // which reads as running. The first cut used u*1.05 (~19px), i.e. eleven
  // cycles a second — legs blurring in place rather than a run.
  if (grounded) ch.phase += (dist / (u * STRIDE_UNITS)) * Math.PI * 2;

  // Amplitude ramps in over a real fraction of a stride, so a figure that
  // starts moving eases into the cycle instead of snapping to full swing.
  const target = grounded ? Math.min(1, dist / (u * 0.10)) : 0;
  ch.amp += (target - ch.amp) * 0.18;
  const amp = ch.amp;

  // --- Placement ------------------------------------------------------------
  // The caller hands us the physics body's CENTRE, and the collider's feet are
  // half its height below that. The rig's own soles sit at local `p.soleY`
  // (negative — the boots hang below the hip chain's origin), and the rig is
  // uniformly scaled by `ch.fit` to match the collider's height. So:
  //
  //   scene sole  = root.y + soleY * fit      must equal   -(y + h/2)
  //   => root.y   = -(y + h/2) - soleY * fit
  //
  // Deriving the drop from the body height alone (as if the soles were at
  // local 0) leaves the figure sunk by exactly |soleY| — the "legs in the
  // ground" bug.
  const h = bodyHeight != null ? bodyHeight : p.standHeight;
  const groundY = -(y + h * 0.5);
  ch.root.position.set(x, groundY - p.soleY * ch.fit, 0);

  // Facing is a mirror. Smoothed so a rapid turn is a quick spin rather than
  // a pop — a hard flip on a fast-moving figure reads as a glitch.
  ch.face += (face - ch.face) * 0.35;
  const f = Math.abs(ch.face) < 0.02 ? 0.02 * Math.sign(ch.face || 1) : ch.face;
  // The mirror multiplies the fit scale — writing a bare 1 here would silently
  // undo it on Y and Z and stretch the figure.
  ch.root.scale.set(f * ch.fit, ch.fit, ch.fit);

  // --- Aim ------------------------------------------------------------------
  // The demo hands over a world-space angle (screen coords, +y down). Scene Y
  // is mirrored, so negate it; the root's X mirror then flips it again for a
  // left-facing figure, which is why the mirror has to be undone here.
  //
  // The un-mirroring MUST use the target facing, not the smoothed `f`. Deriving
  // it from `f` couples the arm to the turn animation: during the ~10 frames the
  // mirror takes to cross zero the two disagree, and the gun swings round to
  // point behind the character until something forces a correction — which is
  // exactly the "hand faces the wrong way until it fires" bug. The mirror
  // animates; which side of the body the arm is solving for does not.
  const faceSign = face < 0 ? -1 : 1;
  const sceneAim = -aim;
  let localAim = faceSign < 0 ? Math.PI - sceneAim : sceneAim;
  // Keep it in (-π, π] so the smoothing below never takes the long way round.
  while (localAim > Math.PI) localAim -= Math.PI * 2;
  while (localAim < -Math.PI) localAim += Math.PI * 2;
  // On the frame the facing actually flips, snap rather than interpolate: the
  // shortest path between the two mirrored solutions sweeps through straight
  // down, which looks like the arm falling off.
  if (faceSign !== ch.lastFaceSign) {
    ch.aim = localAim;
    ch.lastFaceSign = faceSign;
  }
  let d = localAim - ch.aim;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  ch.aim += d * 0.4;

  // Recoil kicks the arm back along its own axis and decays.
  if (firing) { ch.recoil = 1; ch.flashT = 2; }
  ch.recoil *= 0.78;
  if (ch.flashT > 0) ch.flashT--;

  p.aimArm.rotation.z = ch.aim + ch.recoil * 0.30;
  p.aimArm.position.x = u * 0.06 - ch.recoil * u * 0.16;
  if (p.flash) {
    p.flash.visible = ch.flashT > 0;
    if (p.flash.visible) {
      const s = 0.7 + Math.random() * 0.6;
      p.flash.scale.set(s, s, s);
      p.flash.rotation.x = Math.random() * Math.PI;
    }
  }

  // --- Death ---------------------------------------------------------------
  // A full ragdoll would need one body per limb; this is the cheap version —
  // the figure topples backward, folds up and sinks. It reads at demo zoom and
  // costs nothing.
  if (dead > 0) {
    const k = Math.min(1, dead);
    ch.root.rotation.z = -k * Math.PI * 0.48 * Math.sign(f || 1);
    ch.root.position.y -= k * u * 0.55;
    p.torso.rotation.z = k * 0.3;
    p.neck.rotation.z = k * 0.5;
    p.farArm.rotation.z = k * 1.9;
    p.aimArm.rotation.z = ch.aim - k * 1.4;
    p.farLeg.rotation.z = k * 0.5;
    p.nearLeg.rotation.z = -k * 0.7;
    p.farKnee.rotation.z = -k * 1.1;
    p.nearKnee.rotation.z = -k * 1.4;
    return;
  }
  ch.root.rotation.z = 0;

  // --- Legs ----------------------------------------------------------------
  if (!grounded) {
    // Jump/fall tuck: the leading leg comes up, the trailing one drags. Rising
    // and falling get different shapes so the apex is readable.
    const rising = vy < 0;
    const tuck = rising ? 1 : 0.55;
    p.nearLeg.rotation.z = 0.85 * tuck;
    p.farLeg.rotation.z = -0.45 * tuck;
    p.nearKnee.rotation.z = -1.5 * tuck;
    p.farKnee.rotation.z = -0.5 * tuck;
    p.farArm.rotation.z = -0.9 * tuck;
  } else if (crouching) {
    p.nearLeg.rotation.z = 1.05;
    p.farLeg.rotation.z = 0.75;
    p.nearKnee.rotation.z = -1.9;
    p.farKnee.rotation.z = -1.6;
    p.farArm.rotation.z = 0.4;
  } else {
    const swing = Math.sin(ch.phase) * 0.85 * amp;
    p.nearLeg.rotation.z = swing;
    p.farLeg.rotation.z = -swing;
    // The knee only ever bends one way, and mostly on the leg travelling back
    // — a knee that hyperextends forward is the single most obvious tell that
    // a walk cycle is fake.
    p.nearKnee.rotation.z = -Math.max(0, -swing) * 1.5 - 0.08;
    p.farKnee.rotation.z = -Math.max(0, swing) * 1.5 - 0.08;
    // The free arm counter-swings the near leg.
    p.farArm.rotation.z = -swing * 0.8;
  }

  // --- Body carriage --------------------------------------------------------
  // Crouching drops the whole figure rather than shortening the legs, which
  // would need a second set of proportions.
  const crouchDrop = crouching ? u * 0.42 : 0;
  ch.root.position.y -= crouchDrop;

  // A slight forward lean while running, and a bob at twice stride frequency.
  p.torso.rotation.z = -amp * 0.14 - (crouching ? 0.25 : 0);
  p.neck.rotation.z = amp * 0.06;
  const bob = grounded ? Math.abs(Math.cos(ch.phase)) * u * 0.05 * amp : 0;
  ch.root.position.y += bob;

  // --- Headband tails -------------------------------------------------------
  // Whipped backward by speed and lifted by upward motion — the cheapest cue
  // that the figure is moving fast, and it survives even a still silhouette.
  if (p.bandTailA) {
    const whip = Math.min(1, dist / (u * 0.12)) + (grounded ? 0 : 0.5);
    const t = ch.phase * 1.6;
    p.bandTailA.rotation.z = -0.25 - whip * 0.55 + Math.sin(t) * 0.18 * whip;
    p.bandTailB.rotation.z = -0.15 - whip * 0.45 + Math.sin(t + 1.1) * 0.16 * whip;
  }
}
