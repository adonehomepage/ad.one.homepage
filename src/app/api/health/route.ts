import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";

export const dynamic = "force-dynamic";

/** 업타임용 — DB 없이 항상 빠르게 200 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      env: getDeployEnv(),
      appEnv: appConfig.env,
      storage: appConfig.storageProvider,
      leadCollectionEnabled: appConfig.leadCollectionEnabled,
      ts: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
