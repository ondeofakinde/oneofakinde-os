import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, notFound, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallTelemetryEventType } from "@/lib/domain/contracts";

type TelemetryBody = {
  dropId?: string;
  eventType?: string;
  watchTimeSeconds?: number;
  completionPercent?: number;
};

function isTelemetryEventType(value: string): value is TownhallTelemetryEventType {
  return value === "watch_time" || value === "completion" || value === "collect_intent";
}

function getOptionalBodyNumber(payload: Record<string, unknown> | null, key: string): number | undefined {
  const value = payload?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export async function POST(request: Request) {
  const payload = await safeJson<TelemetryBody>(request);
  const body = payload as Record<string, unknown> | null;
  const dropId = getRequiredBodyString(body, "dropId");
  if (!dropId) {
    return badRequest("dropId is required");
  }

  const eventTypeRaw = getRequiredBodyString(body, "eventType");
  if (!eventTypeRaw || !isTelemetryEventType(eventTypeRaw)) {
    return badRequest("eventType must be watch_time, completion, or collect_intent");
  }

  const watchTimeSeconds = getOptionalBodyNumber(body, "watchTimeSeconds");
  const completionPercent = getOptionalBodyNumber(body, "completionPercent");

  if (eventTypeRaw === "watch_time" && (!watchTimeSeconds || watchTimeSeconds <= 0)) {
    return badRequest("watch_time events require watchTimeSeconds > 0");
  }

  if (
    eventTypeRaw === "completion" &&
    completionPercent !== undefined &&
    (completionPercent < 0 || completionPercent > 100)
  ) {
    return badRequest("completionPercent must be between 0 and 100");
  }

  const session = await getRequestSession(request);
  const accepted = await commerceBffService.recordTownhallTelemetryEvent({
    accountId: session?.accountId ?? null,
    dropId,
    eventType: eventTypeRaw,
    watchTimeSeconds,
    completionPercent
  });

  if (!accepted) {
    return notFound("drop not found");
  }

  return ok({ accepted: true }, 202);
}
