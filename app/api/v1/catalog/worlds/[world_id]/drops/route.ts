import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  world_id: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const drops = await commerceBffService.listDropsByWorldId(worldId);
  return ok({ drops });
}
