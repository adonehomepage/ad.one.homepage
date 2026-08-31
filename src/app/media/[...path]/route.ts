import { NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { localFilePath } from "@/lib/storage/local";
import { appConfig } from "@/lib/config";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { path: parts } = await params;
  const [bucket, ...rest] = parts;
  if (bucket !== appConfig.storagePublicBucket) {
    return new Response("Not found", { status: 404 });
  }
  const objectKey = rest.join("/");
  const full = localFilePath(bucket, objectKey);
  try {
    await stat(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const stream = createReadStream(full);
  return new Response(stream as unknown as ReadableStream, {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
