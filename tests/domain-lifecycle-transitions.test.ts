import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "@saltyfactory/domain";

describe("domain lifecycle transitions", () => {
  it("allows expected trend transition", () => {
    expect(canTransition("trend", "new", "reviewed")).toBe(true);
  });

  it("rejects invalid trend transition", () => {
    expect(() => assertTransition("trend", "new", "archived")).toThrow("Invalid trend transition");
  });

  it("allows generation retry transition", () => {
    expect(canTransition("generation_job", "failed", "queued")).toBe(true);
  });

  it("rejects publishing product without approval transition", () => {
    expect(canTransition("product_draft", "draft", "published")).toBe(false);
  });
});
