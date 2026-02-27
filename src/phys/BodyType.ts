import { getNape } from "../core/engine";

/**
 * Body type enumeration.
 *
 * - `STATIC`    — immovable, infinite mass (walls, floors)
 * - `DYNAMIC`   — fully simulated (default)
 * - `KINEMATIC` — moves only via velocity, not affected by forces
 */
export enum BodyType {
  STATIC = "STATIC",
  DYNAMIC = "DYNAMIC",
  KINEMATIC = "KINEMATIC",
}

/** @internal Convert a TS BodyType enum to the raw Haxe BodyType object. */
export function toNativeBodyType(type: BodyType): any {
  const nape = getNape();
  switch (type) {
    case BodyType.STATIC:
      return nape.phys.BodyType.get_STATIC();
    case BodyType.DYNAMIC:
      return nape.phys.BodyType.get_DYNAMIC();
    case BodyType.KINEMATIC:
      return nape.phys.BodyType.get_KINEMATIC();
  }
}

/** @internal Convert a raw Haxe BodyType object to the TS enum. */
export function fromNativeBodyType(native: any): BodyType {
  const nape = getNape();
  if (native === nape.phys.BodyType.get_STATIC()) return BodyType.STATIC;
  if (native === nape.phys.BodyType.get_DYNAMIC()) return BodyType.DYNAMIC;
  if (native === nape.phys.BodyType.get_KINEMATIC()) return BodyType.KINEMATIC;
  throw new Error("Unknown BodyType");
}
