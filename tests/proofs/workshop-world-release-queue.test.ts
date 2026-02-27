import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  GET as getWorkshopWorldReleaseQueueRoute,
  POST as postWorkshopWorldReleaseQueueRoute
} from "../../app/api/v1/workshop/world-release-queue/route";
import { POST as postWorkshopWorldReleaseStatusRoute } from "../../app/api/v1/workshop/world-release-queue/[release_id]/status/route";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { GET as getTownhallFeedRoute } from "../../app/api/v1/townhall/feed/route";
import { commerceBffService } from "../../lib/bff/service";
import type { WorldReleaseQueueItem } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-phase6-world-release-queue-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: workshop world release queue supports creator scheduling and list filtering", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `world-release-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const scheduledFor = new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString();

  const collectorPost = await postWorkshopWorldReleaseQueueRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        worldId: "dark-matter",
        dropId: "voidrunner",
        scheduledFor,
        pacingMode: "weekly"
      })
    })
  );
  assert.equal(collectorPost.status, 403);

  const creatorPost = await postWorkshopWorldReleaseQueueRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        worldId: "dark-matter",
        dropId: "voidrunner",
        scheduledFor,
        pacingMode: "weekly"
      })
    })
  );
  assert.equal(creatorPost.status, 201);
  const creatorPostPayload = await parseJson<{ release: WorldReleaseQueueItem }>(creatorPost);
  assert.equal(creatorPostPayload.release.worldId, "dark-matter");
  assert.equal(creatorPostPayload.release.dropId, "voidrunner");
  assert.equal(creatorPostPayload.release.pacingMode, "weekly");
  assert.equal(creatorPostPayload.release.pacingWindowHours, 168);
  assert.equal(creatorPostPayload.release.status, "scheduled");

  const listResponse = await getWorkshopWorldReleaseQueueRoute(
    new Request(
      "http://127.0.0.1:3000/api/v1/workshop/world-release-queue?world_id=dark-matter",
      {
        headers: {
          "x-ook-session-token": creator.sessionToken
        }
      }
    )
  );
  assert.equal(listResponse.status, 200);
  const listPayload = await parseJson<{ queue: WorldReleaseQueueItem[] }>(listResponse);
  assert.ok(
    listPayload.queue.some((entry) => entry.id === creatorPostPayload.release.id)
  );
});

test("proof: world release pacing conflicts are blocked and status transitions are enforced", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.com",
    role: "creator"
  });

  const firstSchedule = new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString();
  const conflictSchedule = new Date(Date.parse(firstSchedule) + 1000 * 60 * 60 * 6).toISOString();
  const nonConflictSchedule = new Date(Date.parse(firstSchedule) + 1000 * 60 * 60 * 30).toISOString();

  const firstRelease = await postWorkshopWorldReleaseQueueRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        worldId: "dark-matter",
        dropId: "stardust",
        scheduledFor: firstSchedule,
        pacingMode: "daily"
      })
    })
  );
  assert.equal(firstRelease.status, 201);
  const firstPayload = await parseJson<{ release: WorldReleaseQueueItem }>(firstRelease);

  const conflictRelease = await postWorkshopWorldReleaseQueueRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        worldId: "dark-matter",
        dropId: "voidrunner",
        scheduledFor: conflictSchedule,
        pacingMode: "daily"
      })
    })
  );
  assert.equal(conflictRelease.status, 400);

  const nonConflictRelease = await postWorkshopWorldReleaseQueueRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        worldId: "dark-matter",
        dropId: "voidrunner",
        scheduledFor: nonConflictSchedule,
        pacingMode: "daily"
      })
    })
  );
  assert.equal(nonConflictRelease.status, 201);

  const publishResponse = await postWorkshopWorldReleaseStatusRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue/status", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        status: "published"
      })
    }),
    withRouteParams({ release_id: firstPayload.release.id })
  );
  assert.equal(publishResponse.status, 200);
  const publishPayload = await parseJson<{ release: WorldReleaseQueueItem }>(publishResponse);
  assert.equal(publishPayload.release.status, "published");
  assert.ok(publishPayload.release.publishedAt);

  const republishResponse = await postWorkshopWorldReleaseStatusRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/world-release-queue/status", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        status: "published"
      })
    }),
    withRouteParams({ release_id: firstPayload.release.id })
  );
  assert.equal(republishResponse.status, 400);
});

test("proof: world release queue hooks do not regress collect inventory and townhall feed", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `phase6-world-release-regression-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const collectInventory = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=all", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(collectInventory.status, 200);

  const townhallFeed = await getTownhallFeedRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/feed?media=all&ordering=rising", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(townhallFeed.status, 200);
});
