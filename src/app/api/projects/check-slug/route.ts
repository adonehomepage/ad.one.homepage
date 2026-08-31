import { withStaff } from "@/lib/api/http";
import { checkSlugAvailable } from "@/modules/projects/service";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("value") ?? "";
  return withStaff(async () => {
    const parsed = await checkSlugAvailable(value);
    return { available: true, slug: parsed.value };
  });
}
