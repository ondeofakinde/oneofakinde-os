import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  cert_id: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const certId = await getRequiredRouteParam(context, "cert_id");
  if (!certId) {
    return badRequest("cert_id is required");
  }

  const certificate = await commerceGateway.getCertificateById(certId);
  if (!certificate) {
    return notFound("certificate not found");
  }

  return ok({ certificate });
}
