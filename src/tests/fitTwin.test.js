import { describe, it, expect } from "vitest";
import { sizeForChest, howItSits, fitTwin, feedbackNudge, validBody } from "../velvetwolf/account/fit";

describe("fit twin", () => {
  it("picks the size from the size guide's body chest ranges", () => {
    expect(sizeForChest(88)).toBe("S");
    expect(sizeForChest(95)).toBe("S");
    expect(sizeForChest(96)).toBe("M"); // a boundary goes to the larger size
    expect(sizeForChest(104)).toBe("L");
    expect(sizeForChest(130)).toBe("XXL");
  });

  it("describes how a size sits: room round the chest and where the hem falls", () => {
    const m = howItSits("M", { height: 175, chest: 98 });
    expect(m.chestRoom).toBe(57 * 2 - 98);
    expect(m.feel).toBe("relaxed, as it's cut");
    expect(m.hem).toBe("at your hip");
    expect(howItSits("M", { height: 160, chest: 98 }).hem).toMatch(/below your hip/);
  });

  it("compares your size with the one up, or the one down at XXL", () => {
    const t = fitTwin({ height: 178, chest: 104 });
    expect(t.size).toBe("L");
    expect(t.compare.map((c) => c.size)).toEqual(["L", "XL"]);
    expect(fitTwin({ height: 190, chest: 120 }).compare.map((c) => c.size)).toEqual(["XL", "XXL"]);
  });

  it("leans a size up when past tees felt tight", () => {
    expect(feedbackNudge(["tight", "tight", "right"])).toBe(1);
    expect(feedbackNudge(["roomy", "roomy"])).toBe(-1);
    expect(feedbackNudge(["tight"])).toBe(0); // one tee isn't a pattern
    const t = fitTwin({ height: 175, chest: 98 }, ["tight", "tight"]);
    expect(t.size).toBe("L");
    expect(t.nudged).toBe("up");
  });

  it("asks for believable numbers", () => {
    expect(validBody({ height: 17, chest: 98 }).height).toBeTruthy();
    expect(validBody({ height: 175, chest: 9 }).chest).toBeTruthy();
    expect(fitTwin({ height: "", chest: "" })).toBeNull();
  });
});
