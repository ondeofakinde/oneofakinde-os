import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function CollectPage() {
  await requireSession("/collect");
  redirect(routes.myCollection());
}
