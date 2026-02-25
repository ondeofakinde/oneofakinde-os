import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "./load-feed-context";

type TownhallPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function TownhallPage({ searchParams }: TownhallPageProps) {
  const params = (await searchParams) ?? {};
  const {
    viewer,
    drops,
    ownedDropIds,
    socialByDropId,
    nextCursor,
    hasMore,
    pageSize,
    mediaFilter,
    ordering
  } = await loadTownhallFeedContext({
    mediaFilter: firstQueryValue(params.media),
    ordering: firstQueryValue(params.ordering)
  });
  return (
    <TownhallFeedScreen
      mode="townhall"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
      showroomMedia={mediaFilter}
      showroomOrdering={ordering}
    />
  );
}
