import { LiveNowScreen } from "@/features/hubs/live-now-screen";
import { gateway } from "@/lib/gateway";
import { isFeatureEnabled } from "@/lib/ops/feature-flags";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

export default async function LiveNowPage() {
  if (!isFeatureEnabled("surface_live_now")) {
    notFound();
  }

  const [session, drops] = await Promise.all([
    getOptionalSession(),
    gateway.listDrops()
  ]);

  return <LiveNowScreen session={session} drops={drops} />;
}
