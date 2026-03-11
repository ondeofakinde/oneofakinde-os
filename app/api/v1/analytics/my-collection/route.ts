import { requireRequestSession } from "@/lib/bff/auth";
import { notFound, ok, serviceUnavailable } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { isFeatureEnabled } from "@/lib/ops/feature-flags";

export async function GET(request: Request) {
  if (!isFeatureEnabled("analytics_panels_v0")) {
    return serviceUnavailable("analytics panels are disabled");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const panel = await commerceBffService.getMyCollectionAnalyticsPanel(guard.session.accountId);
  if (!panel) {
    return notFound("my collection analytics panel not found");
  }

  return ok({ panel });
}
