import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 업타임용 — 민감 설정 없이 항상 빠르게 200 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
