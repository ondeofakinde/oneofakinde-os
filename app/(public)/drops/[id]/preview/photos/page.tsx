import { DropSurfaceScreen } from "@/features/drops/drop-surfaces-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropPreviewPhotosPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropPreviewPhotosPage({ params }: DropPreviewPhotosPageProps) {
  const { id } = await params;

  const [drop, session] = await Promise.all([
    gateway.getDropById(id),
    getOptionalSession()
  ]);

  if (!drop) {
    notFound();
  }

  return <DropSurfaceScreen drop={drop} session={session} surface="photos_preview" />;
}
