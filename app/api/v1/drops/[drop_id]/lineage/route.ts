import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredRouteParam,
  notFound,
  ok,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  drop_id: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const lineage = await commerceBffService.getDropLineage(dropId);
  if (!lineage) {
    return notFound("drop lineage not found");
  }

  return ok({ lineage });
}
