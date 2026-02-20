import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallGalleryPage() {
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext();
  return (
    <TownhallFeedScreen
      mode="gallery"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
