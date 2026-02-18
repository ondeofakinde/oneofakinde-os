import type { AccountRole } from "@/lib/domain/contracts";

export const SESSION_COOKIE = process.env.OOK_SESSION_COOKIE ?? "ook_session";
export const SESSION_ROLES_COOKIE = process.env.OOK_SESSION_ROLES_COOKIE ?? "ook_session_roles";

const SESSION_ROLE_SET = new Set<AccountRole>(["collector", "creator"]);

export function serializeSessionRoles(roles: AccountRole[]): string {
  const normalized = Array.from(
    new Set(
      roles.map((role) => role.trim()).filter((role): role is AccountRole => SESSION_ROLE_SET.has(role as AccountRole))
    )
  ).sort();

  return normalized.join(",");
}

export function parseSessionRoles(value: string | null | undefined): AccountRole[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part): part is AccountRole => SESSION_ROLE_SET.has(part as AccountRole))
    )
  );
}

export function normalizeReturnTo(
  returnTo: string | null | undefined,
  fallback = "/my-collection"
): string {
  if (!returnTo) return fallback;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return fallback;
  return returnTo;
}
