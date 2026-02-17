"use server";

import { gateway } from "@/lib/gateway";
import { SESSION_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function purchaseDropAction(formData: FormData): Promise<void> {
  const dropId = String(formData.get("drop_id") ?? "").trim();

  if (!dropId) {
    redirect("/my-collection");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await gateway.getSessionByToken(token) : null;

  if (!session) {
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(`/pay/buy/${dropId}`)}`);
  }

  const receipt = await gateway.purchaseDrop(session.accountId, dropId);

  if (!receipt) {
    redirect("/my-collection?status=missing_drop");
  }

  redirect(
    `/my-collection?receipt=${encodeURIComponent(receipt.id)}&status=${encodeURIComponent(receipt.status)}`
  );
}
