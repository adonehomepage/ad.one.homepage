import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 준비 상태 — DB 연결 확인 (배포/오케스트레이터용) */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "error" = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "error";
  }
  const ok = database === "ok";
  return NextResponse.json(
    {
      ok,
      env: getDeployEnv(),
      appEnv: appConfig.env,
      database,
      storage: appConfig.storageProvider,
      latencyMs: Date.now() - started,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
