import { getNape } from "../core/engine";

/**
 * Interaction type filter for interaction listeners.
 */
export enum InteractionType {
  COLLISION = "COLLISION",
  SENSOR = "SENSOR",
  FLUID = "FLUID",
  ANY = "ANY",
}

/** @internal */
export function toNativeInteractionType(type: InteractionType): any {
  const nape = getNape();
  switch (type) {
    case InteractionType.COLLISION:
      return nape.callbacks.InteractionType.get_COLLISION();
    case InteractionType.SENSOR:
      return nape.callbacks.InteractionType.get_SENSOR();
    case InteractionType.FLUID:
      return nape.callbacks.InteractionType.get_FLUID();
    case InteractionType.ANY:
      return nape.callbacks.InteractionType.get_ANY();
  }
}
