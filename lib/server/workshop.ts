import type {
  Drop,
  LiveSession,
  Session,
  TownhallModerationQueueItem,
  World
} from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";

export type WorkshopContext = {
  channelTitle: string;
  channelSynopsis: string;
  worlds: World[];
  drops: Drop[];
  liveSessions: LiveSession[];
  moderationQueue: TownhallModerationQueueItem[];
};

export async function loadWorkshopContext(session: Session): Promise<WorkshopContext> {
  const [creatorSpace, drops, liveSessions, moderationQueue] = await Promise.all([
    gateway.getStudioByHandle(session.handle),
    gateway.listDropsByStudioHandle(session.handle),
    gateway.listWorkshopLiveSessions(session.accountId),
    gateway.listTownhallModerationQueue(session.accountId)
  ]);

  if (!creatorSpace) {
    return {
      channelTitle: `${session.displayName} workshop`,
      channelSynopsis: "creator control surface for planning, publishing, and managing drops.",
      worlds: [],
      drops,
      liveSessions,
      moderationQueue
    };
  }

  const worlds = (
    await Promise.all(creatorSpace.worldIds.map((worldId) => gateway.getWorldById(worldId)))
  ).filter((world): world is World => Boolean(world));

  return {
    channelTitle: creatorSpace.title,
    channelSynopsis: creatorSpace.synopsis,
    worlds,
    drops,
    liveSessions,
    moderationQueue
  };
}
