import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredSearchParam, notFound, ok } from "@/lib/bff/http";

export async function GET(request: Request) {
  const accountId = getRequiredSearchParam(new URL(request.url), "account_id");
  if (!accountId) {
    return badRequest("account_id is required");
  }

  const library = await commerceBffService.getLibrary(accountId);
  if (!library) {
    return notFound("library not found");
  }

  return ok({ library });
}
