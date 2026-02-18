import { WorkshopRootScreen } from "@/features/workshop/workshop-root-screen";
import { requireSessionRoles } from "@/lib/server/session";
import { loadWorkshopContext } from "@/lib/server/workshop";

export default async function WorkshopPage() {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const context = await loadWorkshopContext(session);

  return <WorkshopRootScreen session={session} {...context} />;
}
