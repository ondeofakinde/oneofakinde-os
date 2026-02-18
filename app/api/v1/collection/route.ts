import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { notFound, ok } from "@/lib/bff/http";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const collection = await commerceBffService.getMyCollection(guard.session.accountId);
  if (!collection) {
    return notFound("collection not found");
  }

  return ok({ collection });
}
