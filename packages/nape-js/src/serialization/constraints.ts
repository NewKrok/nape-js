/**
 * Constraint type detection and the UserConstraint codec contract, shared by
 * the JSON and binary serializers.
 *
 * Types are detected with `instanceof`, never `constructor.name`: the
 * published bundle is minified, so class names do not survive it.
 */

import type { Body } from "../phys/Body";
import type { Constraint } from "../constraint/Constraint";
import type { UserConstraint } from "../constraint/UserConstraint";
import { PivotJoint } from "../constraint/PivotJoint";
import { DistanceJoint } from "../constraint/DistanceJoint";
import { AngleJoint } from "../constraint/AngleJoint";
import { MotorJoint } from "../constraint/MotorJoint";
import { LineJoint } from "../constraint/LineJoint";
import { PulleyJoint } from "../constraint/PulleyJoint";
import { WeldJoint } from "../constraint/WeldJoint";
import { SpringJoint } from "../constraint/SpringJoint";

/** Snapshot `type` of every built-in joint. */
export type BuiltinConstraintType =
  | "PivotJoint"
  | "DistanceJoint"
  | "AngleJoint"
  | "MotorJoint"
  | "LineJoint"
  | "PulleyJoint"
  | "WeldJoint"
  | "SpringJoint";

/** The built-in joint type of `c`, or null for a UserConstraint / unknown subclass. */
export function builtinConstraintType(c: Constraint): BuiltinConstraintType | null {
  if (c instanceof PivotJoint) return "PivotJoint";
  if (c instanceof DistanceJoint) return "DistanceJoint";
  if (c instanceof AngleJoint) return "AngleJoint";
  if (c instanceof MotorJoint) return "MotorJoint";
  if (c instanceof LineJoint) return "LineJoint";
  if (c instanceof PulleyJoint) return "PulleyJoint";
  if (c instanceof WeldJoint) return "WeldJoint";
  if (c instanceof SpringJoint) return "SpringJoint";
  return null;
}

/**
 * Tells the serializers how to save and rebuild one `UserConstraint` subclass.
 *
 * A UserConstraint's state lives in fields only its subclass knows about, so
 * it cannot be captured generically. Pass a codec per subclass in
 * {@link SerializationOptions.userConstraints} — to both the save and the
 * load call. Without one, instances of that subclass are skipped when saving.
 *
 * The base constraint properties (`active`, `stiff`, `frequency`, `damping`,
 * `maxForce`, `breakUnderForce`, …) and JSON `userData` are saved and
 * re-applied by the serializer; the codec only handles the subclass's own state.
 *
 * @example
 * ```ts
 * const ropeCodec: UserConstraintCodec<Rope> = {
 *   type: "my-game/Rope",              // stable — stored in the snapshot
 *   ctor: Rope,
 *   bodies: (c) => [c.body1, c.body2],
 *   save: (c) => ({ length: c.length }),
 *   load: (data, [b1, b2]) => new Rope(b1, b2, data.length as number),
 * };
 * const options = { userConstraints: [ropeCodec] };
 * const restored = spaceFromJSON(spaceToJSON(space, options), options);
 * ```
 */
export interface UserConstraintCodec<T extends UserConstraint = UserConstraint> {
  /**
   * Stable identifier stored in the snapshot. Do not derive it from the class
   * name — minifiers rename classes.
   */
  type: string;
  /** The subclass this codec handles; matched with `instanceof`. */
  ctor: abstract new (...args: any[]) => T;
  /** The bodies the constraint links, in the order `load` receives them. */
  bodies(constraint: T): (Body | null)[];
  /** The subclass's own state. Must survive `JSON.stringify` / `JSON.parse`. */
  save(constraint: T): Record<string, unknown>;
  /** Rebuild the constraint from `save()`'s output and the restored bodies. */
  load(data: Record<string, unknown>, bodies: (Body | null)[]): T;
}

/** Options shared by `spaceToJSON` / `spaceFromJSON` / `spaceToBinary` / `spaceFromBinary`. */
export interface SerializationOptions {
  /** Codecs for the `UserConstraint` subclasses in the space. */
  userConstraints?: readonly UserConstraintCodec<any>[];
}

/** The codec that handles `c`, or null. The first matching codec wins. */
export function findUserConstraintCodec(
  c: Constraint,
  options: SerializationOptions | undefined,
): UserConstraintCodec<any> | null {
  const codecs = options?.userConstraints;
  if (codecs == null) return null;
  for (const codec of codecs) {
    if (c instanceof codec.ctor) return codec;
  }
  return null;
}

/** The codec registered under `type`; throws when there is none. */
export function codecForType(
  type: string,
  options: SerializationOptions | undefined,
): UserConstraintCodec<any> {
  const codec = options?.userConstraints?.find((c) => c.type === type);
  if (codec == null) {
    throw new Error(
      `nape-js serialization: snapshot contains a UserConstraint of type "${type}" ` +
        `but no codec for it was passed in options.userConstraints`,
    );
  }
  return codec;
}

/** Check that a codec's `save()` returned a plain object. */
export function checkedUserData(
  codec: UserConstraintCodec<any>,
  data: unknown,
): Record<string, unknown> {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      `nape-js serialization: UserConstraintCodec "${codec.type}".save() must return a plain object`,
    );
  }
  return data as Record<string, unknown>;
}
