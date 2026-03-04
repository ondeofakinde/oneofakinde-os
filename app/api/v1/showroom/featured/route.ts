import { ok } from "@/lib/bff/http";
import { buildShowroomFeaturedLane } from "@/lib/townhall/featured-lane";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const featured = await buildShowroomFeaturedLane({
    limit: url.searchParams.get("limit")
  });

  return ok({ featured });
}
