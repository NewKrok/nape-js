import { describe, expect, it } from "vitest";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";
import { Space } from "../../src/space/Space";
import { Vec2 } from "../../src/geom/Vec2";

const listValues = (list: any): any[] => {
  const values: any[] = [];
  let node = list.head;
  while (node != null) {
    values.push(node.elt);
    node = node.next;
  }
  return values;
};

describe("native listener lifecycle", () => {
  it("registers body listeners in precedence order and updates option membership", () => {
    const space = new Space(new Vec2(0, 0));
    const primary = new CbType();
    const replacement = new CbType();
    const low = new BodyListener(CbEvent.WAKE, primary, () => {}, 1);
    const high = new BodyListener(CbEvent.WAKE, primary, () => {}, 5);

    low.space = space;
    high.space = space;

    expect(listValues(primary.zpp_inner.bodylisteners)).toEqual([high.zpp_inner, low.zpp_inner]);

    high.options = replacement as any;

    expect(listValues(primary.zpp_inner.bodylisteners)).toEqual([low.zpp_inner]);
    expect(listValues(replacement.zpp_inner.bodylisteners)).toEqual([high.zpp_inner]);

    high.space = null;
    low.space = null;

    expect(listValues(primary.zpp_inner.bodylisteners)).toEqual([]);
    expect(listValues(replacement.zpp_inner.bodylisteners)).toEqual([]);
  });

  it("registers constraint listeners in precedence order and validates supported events", () => {
    const space = new Space(new Vec2(0, 0));
    const primary = new CbType();
    const replacement = new CbType();
    const sleep = new ConstraintListener(CbEvent.SLEEP, primary, () => {}, 1);
    const breaking = new ConstraintListener(CbEvent.BREAK, primary, () => {}, 3);

    sleep.space = space;
    breaking.space = space;

    expect(listValues(primary.zpp_inner.conlisteners)).toEqual([
      breaking.zpp_inner,
      sleep.zpp_inner,
    ]);

    sleep.options = replacement as any;

    expect(listValues(primary.zpp_inner.conlisteners)).toEqual([breaking.zpp_inner]);
    expect(listValues(replacement.zpp_inner.conlisteners)).toEqual([sleep.zpp_inner]);

    breaking.space = null;
    sleep.space = null;

    expect(listValues(primary.zpp_inner.conlisteners)).toEqual([]);
    expect(listValues(replacement.zpp_inner.conlisteners)).toEqual([]);
  });
});
