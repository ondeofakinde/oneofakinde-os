import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

function parseLimit(url: URL): number {
  const rawLimit = url.searchParams.get("limit");
  if (!rawLimit) {
    return 25;
  }

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const url = new URL(request.url);
  const dropId = url.searchParams.get("dropId")?.trim() || null;
  const snapshot = await commerceBffService.getCollectIntegritySnapshot({
    dropId,
    limit: parseLimit(url)
  });

  return ok({
    dropId: snapshot.dropId,
    flags: snapshot.flags,
    signalCounts: snapshot.signalCounts,
    recentSignals: snapshot.recentSignals
  });
}
