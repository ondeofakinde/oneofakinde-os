import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  handle: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const studio = await commerceGateway.getStudioByHandle(handle);
  if (!studio) {
    return notFound("studio not found");
  }

  return ok({ studio });
}
