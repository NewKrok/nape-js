/**
 * Concrete type aliases for all dynamically-generated Nape list classes.
 *
 * These aliases use {@link TypedListLike} to give IDE-visible types to the
 * return values of Space and Body query methods, without requiring the
 * dynamic list classes to be statically importable.
 */
import type { TypedListLike } from "./NapeListFactory";
import type { Body } from "../phys/Body";
import type { Compound } from "../phys/Compound";
import type { Shape } from "../shape/Shape";
import type { Constraint } from "../constraint/Constraint";
import type { Arbiter } from "../dynamics/Arbiter";
import type { Listener } from "../callbacks/Listener";
import type { RayResult } from "../geom/RayResult";
import type { ConvexResult } from "../geom/ConvexResult";

export type BodyList = TypedListLike<Body>;
export type CompoundList = TypedListLike<Compound>;
export type ShapeList = TypedListLike<Shape>;
export type ConstraintList = TypedListLike<Constraint>;
export type ArbiterList = TypedListLike<Arbiter>;
export type ListenerList = TypedListLike<Listener>;
export type RayResultList = TypedListLike<RayResult>;
export type ConvexResultList = TypedListLike<ConvexResult>;
