import { gateway } from "@/lib/gateway";
import type { Session } from "@/lib/domain/contracts";
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
