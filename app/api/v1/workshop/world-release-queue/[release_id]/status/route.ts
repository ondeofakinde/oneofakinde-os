import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { WorldReleaseQueueStatus } from "@/lib/domain/contracts";

type PostWorldReleaseStatusBody = {
  status?: string;
};

const WORLD_RELEASE_STATUS_ACTIONS = new Set<Exclude<WorldReleaseQueueStatus, "scheduled">>([
  "published",
  "canceled"
]);

type WorldReleaseStatusRouteProps = {
  params: Promise<{
    release_id: string;
  }>;
};

function parseStatusAction(
  body: Record<string, unknown> | null
): Exclude<WorldReleaseQueueStatus, "scheduled"> | null {
  const status = getRequiredBodyString(body, "status");
  if (!status) {
    return null;
  }

  if (!WORLD_RELEASE_STATUS_ACTIONS.has(status as Exclude<WorldReleaseQueueStatus, "scheduled">)) {
    return null;
  }

  return status as Exclude<WorldReleaseQueueStatus, "scheduled">;
}

export async function POST(request: Request, { params }: WorldReleaseStatusRouteProps) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const resolvedParams = await params;
  const releaseId = resolvedParams.release_id;
  if (!releaseId) {
    return badRequest("release_id is required");
  }

  const body = (await safeJson<PostWorldReleaseStatusBody>(request)) as
    | Record<string, unknown>
    | null;
  const status = parseStatusAction(body);
  if (!status) {
    return badRequest("status must be one of: published, canceled");
  }

  const release = await commerceBffService.updateWorkshopWorldReleaseStatus(
    guard.session.accountId,
    releaseId,
    status
  );
  if (!release) {
    return badRequest("workshop world release status could not be updated");
  }

  return ok({ release });
}
