import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

type TownhallReadPageProps = {
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

export default async function TownhallReadPage({ searchParams }: TownhallReadPageProps) {
  const params = (await searchParams) ?? {};
  const {
    viewer,
    drops,
    ownedDropIds,
    socialByDropId,
    nextCursor,
    hasMore,
    pageSize,
    ordering
  } = await loadTownhallFeedContext({
    mediaFilter: "read",
    ordering: firstQueryValue(params.ordering)
  });
  return (
    <TownhallFeedScreen
      mode="read"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
      showroomMedia="read"
      showroomOrdering={ordering}
    />
  );
}
