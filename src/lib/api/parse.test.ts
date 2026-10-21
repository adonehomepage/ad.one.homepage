import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { parseJsonBody } from "@/lib/api/parse";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("parseJsonBody", () => {
  it("returns parsed data", async () => {
    const data = await parseJsonBody(jsonRequest({ name: "a" }), z.object({ name: z.string().min(1) }));
    expect(data).toEqual({ name: "a" });
  });

  it("throws ApiError on invalid body", async () => {
    await expect(parseJsonBody(jsonRequest({ name: "" }), z.object({ name: z.string().min(1) }))).rejects.toBeInstanceOf(ApiError);
  });

  it("uses fallback when json is empty", async () => {
    const req = new Request("http://localhost/test", { method: "POST", body: "" });
    const data = await parseJsonBody(req, z.object({ reason: z.string().optional() }), {});
    expect(data).toEqual({});
  });

  it("rejects disallowed origin", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.test" },
      body: JSON.stringify({ name: "a" }),
    });
    await expect(parseJsonBody(req, z.object({ name: z.string() }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-json content type", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ name: "a" }),
    });
    await expect(parseJsonBody(req, z.object({ name: z.string() }))).rejects.toMatchObject({ status: 415 });
  });
});
