import { getNape } from "../core/engine";

export enum ShapeType {
  CIRCLE = "CIRCLE",
  POLYGON = "POLYGON",
}

/** @internal */
export function fromNativeShapeType(native: any): ShapeType {
  const nape = getNape();
  if (native === nape.shape.ShapeType.get_CIRCLE()) return ShapeType.CIRCLE;
  if (native === nape.shape.ShapeType.get_POLYGON()) return ShapeType.POLYGON;
  throw new Error("Unknown ShapeType");
}
