import { routes } from "@/lib/routes";
import { redirect } from "next/navigation";

type DropPreviewGalleryLegacyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropPreviewGalleryLegacyPage({ params }: DropPreviewGalleryLegacyPageProps) {
  const { id } = await params;
  redirect(routes.dropPreviewPhotos(id));
}
