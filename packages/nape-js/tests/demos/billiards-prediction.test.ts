/**
 * Fidelity harness for the Billiards demo's shot prediction.
 *
 * The demo predicts a shot by SHADOW SIMULATION: it clones the live space with
 * spaceToJSON/spaceFromJSON, fires the exact shot into the clone, and steps the
 * real engine forward to trace the cue's path and the first ball it strikes.
 *
 * For that to be trustworthy, a round-tripped clone must behave identically to
 * the original space under the same shot. This harness runs many deterministic
 * random shots, and for each compares:
 *   - the prediction (run on a serialized → deserialized clone), against
 *   - an ORACLE (the same shot on a freshly-built, never-serialized space).
 * If serialization drops or perturbs anything that matters (materials, COM,
 * velocities, bullet flag, …) the two diverge and the assertions fail.
 *
 * Mirrors the demo's table build + shot physics — keep in sync with
 * docs/demos/billiards.js.
 */
import { describe, it, expect } from "vitest";
import {
  Body,
  BodyType,
  Circle,
  Polygon,
  Vec2,
  Space,
  Material,
  InteractionFilter,
} from "../../src";
import { spaceToJSON, spaceFromJSON } from "../../src/serialization";

// ── Demo constants (mirror docs/demos/billiards.js) ──────────────────────────
const TABLE_L = 70;
const TABLE_R = 830;
const TABLE_T = 80;
const TABLE_B = 420;
const TABLE_CX = (TABLE_L + TABLE_R) / 2;
const TABLE_CY = (TABLE_T + TABLE_B) / 2;
const CUSHION = 16;
const POCKET_R = 20;
const BALL_R = 11;
const POCKET_GAP = POCKET_R + BALL_R;

const ROLL_DECEL = 4;
const MAX_SHOT_SPEED = 2200;
const GROUP_POCKET = 2;

const PREDICT_FRAMES = 90;
const PREDICT_WAKE = 8;

const KIND_RAIL = "rail";
const KIND_BALL = "ball";
const KIND_CUE = "cue";
const KIND_POCKET = "pocket";

const POCKETS = [
  { x: TABLE_L, y: TABLE_T },
  { x: TABLE_CX, y: TABLE_T },
  { x: TABLE_R, y: TABLE_T },
  { x: TABLE_L, y: TABLE_B },
  { x: TABLE_CX, y: TABLE_B },
  { x: TABLE_R, y: TABLE_B },
];

const BALL_MATERIAL = new Material(0.95, 0.2, 0.3, 1);
const RAIL_MATERIAL = new Material(0.6, 0.4, 0.5, 1);

interface Ball extends Body {
  _id?: number;
}

function buildTable(cuePos: { x: number; y: number }, objPos: { x: number; y: number }[]): Space {
  const space = new Space(new Vec2(0, 0));

  const makeRail = (cx: number, cy: number, w: number, h: number) => {
    const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
    b.shapes.add(new Polygon(Polygon.box(w, h), RAIL_MATERIAL));
    b.userData._kind = KIND_RAIL;
    b.space = space;
  };
  const railY_T = TABLE_T - CUSHION / 2;
  const railY_B = TABLE_B + CUSHION / 2;
  const railX_L = TABLE_L - CUSHION / 2;
  const railX_R = TABLE_R + CUSHION / 2;
  const horizontal = (cy: number) => {
    makeRail(
      (TABLE_L + POCKET_GAP + (TABLE_CX - POCKET_GAP)) / 2,
      cy,
      TABLE_CX - POCKET_GAP - (TABLE_L + POCKET_GAP),
      CUSHION,
    );
    makeRail(
      (TABLE_CX + POCKET_GAP + (TABLE_R - POCKET_GAP)) / 2,
      cy,
      TABLE_R - POCKET_GAP - (TABLE_CX + POCKET_GAP),
      CUSHION,
    );
  };
  horizontal(railY_T);
  horizontal(railY_B);
  const vSeg = (cx: number) =>
    makeRail(cx, TABLE_CY, CUSHION, TABLE_B - POCKET_GAP - (TABLE_T + POCKET_GAP));
  vSeg(railX_L);
  vSeg(railX_R);

  for (const p of POCKETS) {
    const b = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
    const s = new Circle(POCKET_R);
    s.sensorEnabled = true;
    s.filter = new InteractionFilter(GROUP_POCKET, -1);
    b.shapes.add(s);
    b.userData._kind = KIND_POCKET;
    b.space = space;
  }

  const mkBall = (x: number, y: number, kind: string, id: number) => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y)) as Ball;
    b.shapes.add(new Circle(BALL_R, undefined, BALL_MATERIAL));
    b.allowRotation = true;
    b.isBullet = true;
    b.userData._kind = kind;
    b.userData._id = id;
    b.space = space;
  };
  mkBall(cuePos.x, cuePos.y, KIND_CUE, -1);
  objPos.forEach((p, i) => mkBall(p.x, p.y, KIND_BALL, i));
  return space;
}

interface ShotResult {
  hitId: number | null;
  cueAtImpact: { x: number; y: number } | null;
  objDir: { x: number; y: number } | null;
  endPos: { x: number; y: number };
  // Launch direction of EVERY object ball that moved, keyed by ball id, plus
  // the frame it first moved — for validating the multi-ball prediction.
  ballDirs: Map<number, { dir: { x: number; y: number }; frame: number }>;
}

/** Run the demo's exact shot physics on `space`, return contact + end state. */
function runShot(space: Space, ux: number, uy: number, power: number): ShotResult {
  let cue: Ball | null = null;
  const objs: Ball[] = [];
  for (const b of space.bodies) {
    const k = b.userData?._kind;
    if (k === KIND_CUE) cue = b as Ball;
    else if (k === KIND_BALL) objs.push(b as Ball);
  }
  const ballDirs = new Map<number, { dir: { x: number; y: number }; frame: number }>();
  if (!cue)
    return { hitId: null, cueAtImpact: null, objDir: null, endPos: { x: 0, y: 0 }, ballDirs };

  const speed = power * MAX_SHOT_SPEED;
  cue.applyImpulse(new Vec2(ux * speed * cue.mass, uy * speed * cue.mass));

  let hitId: number | null = null;
  let cueAtImpact: { x: number; y: number } | null = null;
  let objDir: { x: number; y: number } | null = null;

  for (let f = 0; f < PREDICT_FRAMES; f++) {
    space.step(1 / 60, 8, 3);
    for (const b of [cue, ...objs]) {
      const v = b.velocity;
      const s = Math.hypot(v.x, v.y);
      if (s <= ROLL_DECEL) {
        b.velocity = new Vec2(0, 0);
        b.angularVel = 0;
      } else {
        const k = (s - ROLL_DECEL) / s;
        b.velocity = new Vec2(v.x * k, v.y * k);
        b.angularVel *= k;
      }
    }
    for (const o of objs) {
      const id = o.userData?._id as number;
      if (ballDirs.has(id)) continue;
      const v = o.velocity;
      const s = Math.hypot(v.x, v.y);
      if (s > PREDICT_WAKE) {
        ballDirs.set(id, { dir: { x: v.x / s, y: v.y / s }, frame: f });
        if (hitId == null) {
          hitId = id;
          cueAtImpact = { x: cue.position.x, y: cue.position.y };
          objDir = { x: v.x / s, y: v.y / s };
        }
      }
    }
    if (Math.hypot(cue.velocity.x, cue.velocity.y) === 0) break;
  }
  return { hitId, cueAtImpact, objDir, endPos: { x: cue.position.x, y: cue.position.y }, ballDirs };
}

// Seeded PRNG so the suite is deterministic.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randPos(rng: () => number) {
  const pad = BALL_R + CUSHION + 4;
  return {
    x: TABLE_L + pad + rng() * (TABLE_R - TABLE_L - 2 * pad),
    y: TABLE_T + pad + rng() * (TABLE_B - TABLE_T - 2 * pad),
  };
}

describe("Billiards shadow-sim prediction fidelity", () => {
  const N = 200;

  const stats = (() => {
    const seed = mulberry32(20260602);
    let mutualHit = 0; // both clone-prediction and fresh-oracle struck a ball
    let ballAgree = 0;
    let ghostErrSum = 0;
    let dirDotSum = 0;
    let hitDisagree = 0; // one struck, the other didn't, or different ball
    let endPosErrSum = 0;
    let runs = 0;
    // Multi-ball: across all balls that moved in BOTH clone and oracle, how
    // closely do their launch directions agree?
    let multiBallPairs = 0;
    let multiBallDotSum = 0;
    let multiBallSetDisagree = 0; // clone and oracle moved a different SET of balls
    const fails: string[] = [];

    for (let i = 0; i < N; i++) {
      // Build the scenario once (positions only), then materialise it twice:
      // once cloned through serialization (prediction), once fresh (oracle).
      const cuePos = randPos(seed);
      const objPos: { x: number; y: number }[] = [];
      let tries = 0;
      while (objPos.length < 4 && tries < 200) {
        tries++;
        const p = randPos(seed);
        if ([cuePos, ...objPos].some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 3 * BALL_R))
          continue;
        objPos.push(p);
      }
      const ang = seed() * Math.PI * 2;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      const power = 0.3 + seed() * 0.7;

      // Prediction path: serialize → deserialize, then run the shot on the clone.
      const live = buildTable(cuePos, objPos);
      const clone = spaceFromJSON(spaceToJSON(live));
      const pred = runShot(clone, ux, uy, power);

      // Oracle path: a fresh space, never serialized.
      const oracle = runShot(buildTable(cuePos, objPos), ux, uy, power);

      runs++;
      endPosErrSum += Math.hypot(pred.endPos.x - oracle.endPos.x, pred.endPos.y - oracle.endPos.y);

      const pHit = pred.hitId != null;
      const oHit = oracle.hitId != null;
      if (pHit && oHit) {
        mutualHit++;
        if (pred.hitId === oracle.hitId) {
          ballAgree++;
          if (pred.cueAtImpact && oracle.cueAtImpact)
            ghostErrSum += Math.hypot(
              pred.cueAtImpact.x - oracle.cueAtImpact.x,
              pred.cueAtImpact.y - oracle.cueAtImpact.y,
            );
          if (pred.objDir && oracle.objDir)
            dirDotSum += pred.objDir.x * oracle.objDir.x + pred.objDir.y * oracle.objDir.y;
        } else if (fails.length < 10) {
          fails.push(`#${i}: clone hit ${pred.hitId}, fresh hit ${oracle.hitId}`);
        }
      } else if (pHit !== oHit) {
        hitDisagree++;
        if (fails.length < 10)
          fails.push(`#${i}: clone hit=${pred.hitId}, fresh hit=${oracle.hitId}`);
      }

      // Multi-ball direction agreement over the balls that moved in both.
      if (pred.ballDirs.size !== oracle.ballDirs.size) multiBallSetDisagree++;
      for (const [id, p] of pred.ballDirs) {
        const o = oracle.ballDirs.get(id);
        if (!o) continue;
        multiBallPairs++;
        multiBallDotSum += p.dir.x * o.dir.x + p.dir.y * o.dir.y;
      }
    }

    return {
      runs,
      mutualHit,
      ballAgree,
      ghostErr: ballAgree ? ghostErrSum / ballAgree : 0,
      dirDot: ballAgree ? dirDotSum / ballAgree : 1,
      hitDisagree,
      endPosErr: runs ? endPosErrSum / runs : 0,
      multiBallPairs,
      multiBallDot: multiBallPairs ? multiBallDotSum / multiBallPairs : 1,
      multiBallSetDisagree,
      fails,
    };
  })();

  it("reports the clone-vs-fresh fidelity breakdown", () => {
    console.log(
      [
        `\n── Shadow-sim fidelity (N=${N}) ──`,
        `runs:                    ${stats.runs}`,
        `mutual hits:             ${stats.mutualHit}`,
        `  same ball:             ${stats.ballAgree}/${stats.mutualHit}`,
        `  mean ghost error:      ${stats.ghostErr.toFixed(2)} px`,
        `  mean objDir dot:       ${stats.dirDot.toFixed(4)} (1.0 = identical)`,
        `hit/miss disagreements:  ${stats.hitDisagree}`,
        `mean cue end-pos error:  ${stats.endPosErr.toFixed(2)} px`,
        `multi-ball dir pairs:    ${stats.multiBallPairs}`,
        `  mean dir dot:          ${stats.multiBallDot.toFixed(4)}`,
        `  moved-set disagree:    ${stats.multiBallSetDisagree}`,
        stats.fails.length ? "samples:\n  " + stats.fails.join("\n  ") : "",
      ].join("\n"),
    );
    expect(stats.runs).toBe(N);
  });

  it("a serialized clone strikes the same ball as a fresh space", () => {
    // Round-trip must not change which ball is hit (allow a tiny grazing margin).
    expect(stats.ballAgree / Math.max(1, stats.mutualHit)).toBeGreaterThanOrEqual(0.98);
  });

  it("rarely disagrees on whether a ball is struck at all", () => {
    expect(stats.hitDisagree / Math.max(1, stats.runs)).toBeLessThan(0.03);
  });

  it("ghost (cue-at-impact) and struck direction are near-identical to fresh", () => {
    expect(stats.ghostErr).toBeLessThan(2); // px
    expect(stats.dirDot).toBeGreaterThan(0.999);
  });

  it("the cue ends in essentially the same place as a fresh sim", () => {
    expect(stats.endPosErr).toBeLessThan(2); // px averaged over all runs
  });

  it("every moved ball's launch direction matches a fresh sim (multi-ball guide)", () => {
    // The demo draws a direction arrow for EVERY ball the shot sets in motion;
    // each must agree with the fresh oracle, or the multi-ball guide is wrong.
    expect(stats.multiBallPairs).toBeGreaterThan(0);
    expect(stats.multiBallDot).toBeGreaterThan(0.999);
  });
});
