import { NextRequest } from "next/server";
import { appConfig } from "@/lib/config";
import { readPublicObject, storageProviderName } from "@/lib/storage";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { path: parts } = await params;
  const [bucket, ...rest] = parts;
  if (bucket !== appConfig.storagePublicBucket) {
    return new Response("Not found", { status: 404 });
  }
  const objectKey = rest.join("/");
  if (!objectKey || objectKey.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const object = await readPublicObject(bucket, objectKey);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(object.bytes), {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Storage-Provider": storageProviderName(),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
