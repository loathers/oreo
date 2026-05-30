import { describe, expect, it, vi } from "vitest";

import { getSparklyClusterSize } from "../src/mining";

vi.mock("kolmafia", () => ({
  haveEffect: () => 0,
  isWearingOutfit: () => false,
  myBuffedstat: () => 0,
  visitUrl: () => "",
}));

vi.mock("libram", () => ({
  $effect: () => undefined,
  $element: () => undefined,
  $skill: () => undefined,
  $stat: () => undefined,
  chunk: <T>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  },
  damageTakenByElement: () => 0,
  extractItems: () => new Map(),
  get: () => "",
  have: () => false,
  tuple: <T extends unknown[]>(...args: T) => args,
}));

const matrix = (rows: string[]) => rows.map((r) => r.split(""));

describe("getSparklyClusterSize", () => {
  it("returns 1 for an isolated sparkle", () => {
    const state = matrix(["......", "..*...", "......", "......", "......", "......"]);
    expect(getSparklyClusterSize([3, 2], state)).toBe(1);
  });

  it("counts an L-shaped cluster of 3 from any cell", () => {
    const state = matrix(["......", ".**...", ".*....", "......", "......", "......"]);
    expect(getSparklyClusterSize([2, 2], state)).toBe(3);
    expect(getSparklyClusterSize([3, 2], state)).toBe(3);
    expect(getSparklyClusterSize([2, 3], state)).toBe(3);
  });

  it("counts a full row of 6 sparkles (boundary for < 6 filter)", () => {
    const state = matrix(["......", "......", "******", "......", "......", "......"]);
    expect(getSparklyClusterSize([1, 3], state)).toBe(6);
    expect(getSparklyClusterSize([6, 3], state)).toBe(6);
  });

  it("does not flood-fill diagonally", () => {
    const state = matrix(["*.....", ".*....", "......", "......", "......", "......"]);
    expect(getSparklyClusterSize([1, 1], state)).toBe(1);
    expect(getSparklyClusterSize([2, 2], state)).toBe(1);
  });

  it("handles the bottom-right corner (6, 6)", () => {
    const state = matrix(["......", "......", "......", "......", "......", ".....*"]);
    expect(getSparklyClusterSize([6, 6], state)).toBe(1);
  });

  it("looks at the requested cell, not an offset one", () => {
    const state = matrix(["......", ".*....", "......", "......", "......", "......"]);
    expect(getSparklyClusterSize([1, 1], state)).toBe(0);
    expect(getSparklyClusterSize([2, 2], state)).toBe(1);
  });
});
