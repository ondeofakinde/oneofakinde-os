import { gateway } from "@/lib/gateway";
import type { AccountRole, Session } from "@/lib/domain/contracts";
import { SESSION_COOKIE, normalizeReturnTo } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getOptionalSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return gateway.getSessionByToken(token);
}

export async function requireSession(returnTo: string): Promise<Session> {
  const session = await getOptionalSession();

  if (session) {
    return session;
  }

  redirect(`/auth/sign-in?returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`);
}

export async function requireSessionRoles(
  returnTo: string,
  allowedRoles: AccountRole[]
): Promise<Session> {
  const session = await requireSession(returnTo);
  const roleSet = new Set(session.roles);
  const hasAllowedRole = allowedRoles.some((role) => roleSet.has(role));

  if (hasAllowedRole) {
    return session;
  }

  redirect(
    `/auth/sign-in?error=role_required&returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`
  );
}
