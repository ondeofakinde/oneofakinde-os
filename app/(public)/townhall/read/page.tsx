import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";
import { readTownhallOrderMode, type TownhallSearchParams } from "../read-order-mode";

type TownhallReadPageProps = {
  searchParams?: Promise<TownhallSearchParams>;
};

export default async function TownhallReadPage({ searchParams }: TownhallReadPageProps) {
  const orderMode = await readTownhallOrderMode(searchParams);
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext({ orderMode });

  return (
    <TownhallFeedScreen
      mode="read"
      orderMode={orderMode}
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
