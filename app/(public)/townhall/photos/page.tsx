import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";
import { readTownhallOrderMode, type TownhallSearchParams } from "../read-order-mode";

type TownhallPhotosPageProps = {
  searchParams?: Promise<TownhallSearchParams>;
};

export default async function TownhallPhotosPage({ searchParams }: TownhallPhotosPageProps) {
  const orderMode = await readTownhallOrderMode(searchParams);
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext({ orderMode });

  return (
    <TownhallFeedScreen
      mode="photos"
      orderMode={orderMode}
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
