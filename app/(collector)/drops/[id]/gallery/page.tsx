import { routes } from "@/lib/routes";
import { redirect } from "next/navigation";

type DropGalleryLegacyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropGalleryLegacyPage({ params }: DropGalleryLegacyPageProps) {
  const { id } = await params;
  redirect(routes.dropPhotos(id));
}
