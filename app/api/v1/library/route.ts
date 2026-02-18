import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { notFound, ok } from "@/lib/bff/http";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const library = await commerceBffService.getLibrary(guard.session.accountId);
  if (!library) {
    return notFound("library not found");
  }

  return ok({ library });
}
