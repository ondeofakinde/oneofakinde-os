export const SESSION_COOKIE = process.env.OOK_SESSION_COOKIE ?? "ook_session";

export function normalizeReturnTo(
  returnTo: string | null | undefined,
  fallback = "/my-collection"
): string {
  if (!returnTo) return fallback;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return fallback;
  return returnTo;
}
