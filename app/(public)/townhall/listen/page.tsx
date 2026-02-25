import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";
import { readTownhallOrderMode, type TownhallSearchParams } from "../read-order-mode";

type TownhallListenPageProps = {
  searchParams?: Promise<TownhallSearchParams>;
};

export default async function TownhallListenPage({ searchParams }: TownhallListenPageProps) {
  const orderMode = await readTownhallOrderMode(searchParams);
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext({ orderMode });

  return (
    <TownhallFeedScreen
      mode="listen"
      orderMode={orderMode}
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
