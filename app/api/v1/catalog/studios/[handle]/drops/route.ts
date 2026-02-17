import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  handle: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const drops = await commerceGateway.listDropsByStudioHandle(handle);
  return ok({ drops });
}
