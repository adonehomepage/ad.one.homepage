import { describe, expect, it } from "vitest";
import { leadControllerBlockMessage } from "@/modules/leads/controller-gate";

describe("leadControllerBlockMessage", () => {
  it("allows a real collecting controller", () => {
    expect(leadControllerBlockMessage("애드잇", {})).toBeNull();
  });

  it("blocks empty and placeholder controllers", () => {
    expect(leadControllerBlockMessage("", {})).toMatch(/접수할 수 없습니다/);
    expect(leadControllerBlockMessage("  ", {})).toMatch(/접수할 수 없습니다/);
    expect(leadControllerBlockMessage("처리주체미정", {})).toMatch(/접수할 수 없습니다/);
    expect(leadControllerBlockMessage("광고주명미정", {})).toMatch(/접수할 수 없습니다/);
  });

  it("uses formControllerUnset chrome when set", () => {
    expect(
      leadControllerBlockMessage("처리주체미정", { formControllerUnset: "지금은 받을 수 없습니다." }),
    ).toBe("지금은 받을 수 없습니다.");
  });
});
