import { describe, expect, it } from "vitest";
import { csvCell } from "@/modules/leads/csv";

describe("csvCell", () => {
  it("escapes commas and quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("prefixes formula-like values", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+cmd")).toBe("'+cmd");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@sum")).toBe("'@sum");
  });
});
