import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

type TownhallPhotosPageProps = {
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

export default async function TownhallPhotosPage({ searchParams }: TownhallPhotosPageProps) {
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
    mediaFilter: "photos",
    ordering: firstQueryValue(params.ordering)
  });
  return (
    <TownhallFeedScreen
      mode="photos"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
      showroomMedia="photos"
      showroomOrdering={ordering}
    />
  );
}
