"use server";

import type {
  CreateWorkshopLiveSessionInput,
  LiveSessionEligibilityRule
} from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import { redirect } from "next/navigation";

const LIVE_ELIGIBILITY_RULES = new Set<LiveSessionEligibilityRule>([
  "public",
  "membership_active",
  "drop_owner"
]);

function getRequiredFormString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function getOptionalFormString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  if (!value || value === "none") {
    return null;
  }
  return value;
}

function parseCreateLiveSessionInput(formData: FormData): CreateWorkshopLiveSessionInput | null {
  const title = getRequiredFormString(formData, "title");
  const startsAt = getRequiredFormString(formData, "starts_at");
  const eligibilityRule = getRequiredFormString(formData, "eligibility_rule");

  if (!title || !startsAt || !eligibilityRule) {
    return null;
  }

  if (!LIVE_ELIGIBILITY_RULES.has(eligibilityRule as LiveSessionEligibilityRule)) {
    return null;
  }

  const startsAtMs = Date.parse(startsAt);
  if (!Number.isFinite(startsAtMs)) {
    return null;
  }

  const endsAtRaw = getOptionalFormString(formData, "ends_at");
  if (endsAtRaw) {
    const endsAtMs = Date.parse(endsAtRaw);
    if (!Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
      return null;
    }
  }

  const dropId = getOptionalFormString(formData, "drop_id");
  if (eligibilityRule === "drop_owner" && !dropId) {
    return null;
  }

  return {
    title,
    synopsis: getOptionalFormString(formData, "synopsis") ?? "",
    worldId: getOptionalFormString(formData, "world_id"),
    dropId,
    startsAt: new Date(startsAtMs).toISOString(),
    endsAt: endsAtRaw ? new Date(Date.parse(endsAtRaw)).toISOString() : null,
    eligibilityRule: eligibilityRule as LiveSessionEligibilityRule
  };
}

export async function createWorkshopLiveSessionAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const input = parseCreateLiveSessionInput(formData);
  if (!input) {
    redirect("/workshop?event_status=invalid_input");
  }

  const created = await gateway.createWorkshopLiveSession(session.accountId, input);
  if (!created) {
    redirect("/workshop?event_status=create_failed");
  }

  redirect(
    `/workshop?event_status=created&event_id=${encodeURIComponent(created.id)}`
  );
}
