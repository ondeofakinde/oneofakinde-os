import { StudioScreen } from "@/features/studio/studio-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type StudioPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function StudioPage({ params }: StudioPageProps) {
  const { handle } = await params;

  const [session, studio, drops] = await Promise.all([
    getOptionalSession(),
    commerceGateway.getStudioByHandle(handle),
    commerceGateway.listDropsByStudioHandle(handle)
  ]);

  if (!studio) {
    notFound();
  }

  const worlds = (
    await Promise.all(studio.worldIds.map((worldId) => commerceGateway.getWorldById(worldId)))
  ).filter((world): world is NonNullable<typeof world> => Boolean(world));

  return <StudioScreen session={session} studio={studio} worlds={worlds} drops={drops} />;
}
