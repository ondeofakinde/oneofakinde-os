import { WorkshopRootScreen } from "@/features/workshop/workshop-root-screen";
import { requireSessionRoles } from "@/lib/server/session";
import { loadWorkshopContext } from "@/lib/server/workshop";
import {
  createWorkshopLiveSessionAction,
  resolveWorkshopModerationCaseAction
} from "./actions";

type WorkshopPageProps = {
  searchParams: Promise<{
    event_status?: string | string[];
    event_id?: string | string[];
    moderation_status?: string | string[];
    moderation_comment_id?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function toEventNotice(eventStatus: string | null, eventId: string | null): string | null {
  if (!eventStatus) {
    return null;
  }

  if (eventStatus === "created") {
    return eventId
      ? `live session created: ${eventId}. it is now visible in collect gated events.`
      : "live session created. it is now visible in collect gated events.";
  }

  if (eventStatus === "invalid_input") {
    return "live session could not be created. check title, time fields, and eligibility requirements.";
  }

  if (eventStatus === "create_failed") {
    return "live session could not be created for this creator/workshop scope.";
  }

  return "workshop live-session status updated.";
}

function toModerationNotice(
  moderationStatus: string | null,
  moderationCommentId: string | null
): string | null {
  if (!moderationStatus) {
    return null;
  }

  if (moderationStatus === "resolved") {
    return moderationCommentId
      ? `moderation case resolved: ${moderationCommentId}.`
      : "moderation case resolved.";
  }

  if (moderationStatus === "invalid_input") {
    return "moderation action failed: missing or invalid resolution input.";
  }

  if (moderationStatus === "forbidden") {
    return "moderation action blocked: creator authorization is required.";
  }

  if (moderationStatus === "not_found") {
    return "moderation case not found.";
  }

  return "workshop moderation status updated.";
}

export default async function WorkshopPage({ searchParams }: WorkshopPageProps) {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const resolvedSearchParams = await searchParams;
  const eventStatus = firstParam(resolvedSearchParams.event_status);
  const eventId = firstParam(resolvedSearchParams.event_id);
  const moderationStatus = firstParam(resolvedSearchParams.moderation_status);
  const moderationCommentId = firstParam(resolvedSearchParams.moderation_comment_id);
  const context = await loadWorkshopContext(session);

  return (
    <WorkshopRootScreen
      session={session}
      eventNotice={toEventNotice(eventStatus, eventId)}
      moderationNotice={toModerationNotice(moderationStatus, moderationCommentId)}
      createLiveSessionAction={createWorkshopLiveSessionAction}
      resolveModerationAction={resolveWorkshopModerationCaseAction}
      {...context}
    />
  );
}
