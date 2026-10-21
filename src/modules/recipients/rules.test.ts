import { describe, expect, it } from "vitest";
import { assertRecipientLimit } from "@/modules/recipients/rules";
import { ApiError } from "@/lib/errors";
import { appConfig } from "@/lib/config";

describe("assertRecipientLimit", () => {
  it("allows under the max", () => {
    expect(() => assertRecipientLimit(0)).not.toThrow();
    expect(() => assertRecipientLimit(appConfig.maxRecipients - 1)).not.toThrow();
  });

  it("blocks at the max", () => {
    expect(() => assertRecipientLimit(appConfig.maxRecipients)).toThrow(ApiError);
  });
});
