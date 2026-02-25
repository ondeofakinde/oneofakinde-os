import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";
import { readTownhallOrderMode, type TownhallSearchParams } from "../read-order-mode";

type TownhallWatchPageProps = {
  searchParams?: Promise<TownhallSearchParams>;
};

export default async function TownhallWatchPage({ searchParams }: TownhallWatchPageProps) {
  const orderMode = await readTownhallOrderMode(searchParams);
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext({ orderMode });

  return (
    <TownhallFeedScreen
      mode="watch"
      orderMode={orderMode}
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
