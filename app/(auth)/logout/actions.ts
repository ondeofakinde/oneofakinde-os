"use server";

import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { SESSION_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await commerceGateway.clearSession(token);
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect("/auth/sign-in");
}
