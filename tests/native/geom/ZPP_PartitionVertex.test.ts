import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_PartitionVertex } from "../../../src/native/geom/ZPP_PartitionVertex";

describe("ZPP_PartitionVertex", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_PartitionVertex.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_PartitionVertex",
      ]);
    });
  });

  // Constructor requires getNape() engine initialization
  // Integration-level tests cover vertex creation paths
});
