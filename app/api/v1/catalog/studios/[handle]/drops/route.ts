import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  handle: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const drops = await commerceBffService.listDropsByStudioHandle(handle);
  return ok({ drops });
}
