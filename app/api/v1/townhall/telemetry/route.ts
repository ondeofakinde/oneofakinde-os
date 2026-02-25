import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, notFound, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallTelemetryEventType, TownhallTelemetryMetadata } from "@/lib/domain/contracts";

type TelemetryBody = {
  dropId?: string;
  eventType?: string;
  watchTimeSeconds?: number;
  completionPercent?: number;
  metadata?: TownhallTelemetryMetadata;
};

function isTelemetryEventType(value: string): value is TownhallTelemetryEventType {
  return new Set<TownhallTelemetryEventType>([
    "watch_time",
    "completion",
    "collect_intent",
    "impression",
    "showroom_impression",
    "drop_opened",
    "drop_dwell_time",
    "preview_start",
    "preview_complete",
    "access_start",
    "access_complete",
    "interaction_like",
    "interaction_comment",
    "interaction_share",
    "interaction_save"
  ]).has(value as TownhallTelemetryEventType);
}

function getOptionalBodyNumber(payload: Record<string, unknown> | null, key: string): number | undefined {
  const value = payload?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function getOptionalTelemetryMetadata(
  payload: Record<string, unknown> | null
): TownhallTelemetryMetadata | undefined {
  const value = payload?.metadata;
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return value as TownhallTelemetryMetadata;
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
    return badRequest("eventType is invalid");
  }

  const watchTimeSeconds = getOptionalBodyNumber(body, "watchTimeSeconds");
  const completionPercent = getOptionalBodyNumber(body, "completionPercent");
  const metadata = getOptionalTelemetryMetadata(body);

  if (
    (eventTypeRaw === "watch_time" || eventTypeRaw === "drop_dwell_time") &&
    (!watchTimeSeconds || watchTimeSeconds <= 0)
  ) {
    return badRequest("watch_time and drop_dwell_time events require watchTimeSeconds > 0");
  }

  if (
    (eventTypeRaw === "completion" ||
      eventTypeRaw === "preview_complete" ||
      eventTypeRaw === "access_complete") &&
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
    completionPercent,
    metadata
  });

  if (!accepted) {
    return notFound("drop not found");
  }

  return ok({ accepted: true }, 202);
}
