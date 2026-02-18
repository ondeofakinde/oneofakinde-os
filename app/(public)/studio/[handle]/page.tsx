import { StudioScreen } from "@/features/studio/studio-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type StudioPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function StudioCanonicalPage({ params }: StudioPageProps) {
  const { handle } = await params;

  const [session, studio, drops] = await Promise.all([
    getOptionalSession(),
    gateway.getStudioByHandle(handle),
    gateway.listDropsByStudioHandle(handle)
  ]);

  if (!studio) {
    notFound();
  }

  const worlds = (
    await Promise.all(studio.worldIds.map((worldId) => gateway.getWorldById(worldId)))
  ).filter((world): world is NonNullable<typeof world> => Boolean(world));

  return <StudioScreen session={session} studio={studio} worlds={worlds} drops={drops} />;
}
