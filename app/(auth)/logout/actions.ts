"use server";

import { gateway } from "@/lib/gateway";
import { SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await gateway.clearSession(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SESSION_ROLES_COOKIE);
  redirect("/auth/sign-in");
}
