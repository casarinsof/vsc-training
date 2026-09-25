import { describe, expect, it } from "vitest";
import { completionPercentage } from "./index";

describe("completionPercentage", () => {
  it("calcola e limita la percentuale", () => {
    expect(completionPercentage(2, 5)).toBe(40);
    expect(completionPercentage(8, 5)).toBe(100);
    expect(completionPercentage(1, 0)).toBe(0);
  });
});