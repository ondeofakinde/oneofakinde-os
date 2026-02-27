import type {
  Drop,
  LiveSession,
  Session,
  TownhallModerationQueueItem,
  WorldReleaseQueueItem,
  World
} from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";

export type WorkshopContext = {
  channelTitle: string;
  channelSynopsis: string;
  worlds: World[];
  drops: Drop[];
  liveSessions: LiveSession[];
  worldReleaseQueue: WorldReleaseQueueItem[];
  moderationQueue: TownhallModerationQueueItem[];
};

export async function loadWorkshopContext(session: Session): Promise<WorkshopContext> {
  const [creatorSpace, drops, liveSessions, worldReleaseQueue, moderationQueue] = await Promise.all([
    gateway.getStudioByHandle(session.handle),
    gateway.listDropsByStudioHandle(session.handle),
    gateway.listWorkshopLiveSessions(session.accountId),
    gateway.listWorkshopWorldReleaseQueue(session.accountId),
    gateway.listTownhallModerationQueue(session.accountId)
  ]);

  if (!creatorSpace) {
    return {
      channelTitle: `${session.displayName} workshop`,
      channelSynopsis: "creator control surface for planning, publishing, and managing drops.",
      worlds: [],
      drops,
      liveSessions,
      worldReleaseQueue,
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
    worldReleaseQueue,
    moderationQueue
  };
}
