import { describe, expect, it } from "vitest";
import { withLinkedSiteName } from "@/modules/templates/definitions";

describe("withLinkedSiteName", () => {
  it("updates linked hero headline and directions placeName prefix", () => {
    const next = withLinkedSiteName(
      [
        { sectionType: "hero", content: { headline: "옛 단지", subheadline: "바다 전망 카피" } },
        { sectionType: "directions", content: { placeName: "옛 단지 / 주택전시관" } },
        { sectionType: "directions", content: { placeName: "별도 견본주택" } },
      ],
      "옛 단지",
      "새 단지",
    );
    expect(next[0]?.content.headline).toBe("새 단지");
    expect(next[0]?.content.subheadline).toBe("바다 전망 카피");
    expect(next[1]?.content.placeName).toBe("새 단지 / 주택전시관");
    expect(next[2]?.content.placeName).toBe("별도 견본주택");
  });

  it("does not overwrite an independent hero headline or ad copy", () => {
    const next = withLinkedSiteName(
      [
        {
          sectionType: "hero",
          content: { headline: "광안리 오션뷰의 완성", subheadline: "센텀과 해변을 잇는 단지" },
        },
        { sectionType: "directions", content: { placeName: "옛 단지 견본주택" } },
      ],
      "옛 단지",
      "새 단지",
    );
    expect(next[0]?.content.headline).toBe("광안리 오션뷰의 완성");
    expect(next[0]?.content.subheadline).toBe("센텀과 해변을 잇는 단지");
    expect(next[1]?.content.placeName).toBe("새 단지 견본주택");
  });
});
