import { describe, expect, it } from "vitest";
import { resolveWindowIndex } from "@/lib/scoring/windows";

describe("resolveWindowIndex", () => {
  it("returns window 1 for matches up to 35", () => {
    expect(resolveWindowIndex(1)).toBe(1);
    expect(resolveWindowIndex(35)).toBe(1);
  });

  it("returns window 2 between 36 and 70", () => {
    expect(resolveWindowIndex(36)).toBe(2);
    expect(resolveWindowIndex(70)).toBe(2);
  });

  it("returns window 3 for matches 71 onwards", () => {
    expect(resolveWindowIndex(71)).toBe(3);
    expect(resolveWindowIndex(90)).toBe(3);
  });
});
