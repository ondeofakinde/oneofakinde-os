import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export async function loadTownhallFeedContext() {
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);

  if (!session) {
    return {
      session,
      drops,
      ownedDropIds: [] as string[]
    };
  }

  const collection = await gateway.getMyCollection(session.accountId);

  return {
    session,
    drops,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id)
  };
}
