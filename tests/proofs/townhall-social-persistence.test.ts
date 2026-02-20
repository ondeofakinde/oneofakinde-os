import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getLibraryRoute } from "../../app/api/v1/library/route";
import { GET as getTownhallSocialRoute } from "../../app/api/v1/townhall/social/route";
import { POST as postTownhallCommentRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/route";
import { POST as postTownhallLikeRoute } from "../../app/api/v1/townhall/social/likes/[drop_id]/route";
import { POST as postTownhallSaveRoute } from "../../app/api/v1/townhall/social/saves/[drop_id]/route";
import { POST as postTownhallShareRoute } from "../../app/api/v1/townhall/social/shares/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallDropSocialSnapshot } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-townhall-social-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function socialForDrop(
  map: Record<string, TownhallDropSocialSnapshot>,
  dropId: string
): TownhallDropSocialSnapshot {
  const social = map[dropId];
  assert.ok(social, `expected social snapshot for ${dropId}`);
  return social;
}

test("proof: townhall social actions persist via bff routes", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `townhall-social-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drop = (await commerceBffService.listDrops())[0];
  assert.ok(drop, "expected at least one drop");

  const socialBaseResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`)
  );
  assert.equal(socialBaseResponse.status, 200);
  const socialBasePayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(socialBaseResponse);
  const baseline = socialForDrop(socialBasePayload.social.byDropId, drop.id);

  const unauthorizedLikeResponse = await postTownhallLikeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST"
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(unauthorizedLikeResponse.status, 401);

  const likeResponse = await postTownhallLikeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(likeResponse.status, 200);
  const likePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(likeResponse);
  assert.equal(likePayload.social.likedByViewer, true);
  assert.equal(likePayload.social.likeCount, baseline.likeCount + 1);

  const commentBody = "townhall social persistence proof comment";
  const commentResponse = await postTownhallCommentRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        body: commentBody
      })
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(commentResponse.status, 201);
  const commentPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(commentResponse);
  assert.equal(commentPayload.social.commentCount, baseline.commentCount + 1);
  assert.equal(commentPayload.social.comments[0]?.body, commentBody);
  assert.equal(commentPayload.social.comments[0]?.authorHandle, session.handle);

  const saveResponse = await postTownhallSaveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/saves/${drop.id}`, {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(saveResponse.status, 200);
  const savePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(saveResponse);
  assert.equal(savePayload.social.savedByViewer, true);

  const shareResponse = await postTownhallShareRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/shares/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        channel: "telegram"
      })
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(shareResponse.status, 201);
  const sharePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(shareResponse);
  assert.equal(sharePayload.social.shareCount, baseline.shareCount + 1);

  const socialRefreshResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(socialRefreshResponse.status, 200);
  const socialRefreshPayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(socialRefreshResponse);
  const refreshed = socialForDrop(socialRefreshPayload.social.byDropId, drop.id);
  assert.equal(refreshed.likedByViewer, true);
  assert.equal(refreshed.savedByViewer, true);
  assert.equal(refreshed.likeCount, baseline.likeCount + 1);
  assert.equal(refreshed.commentCount, baseline.commentCount + 1);
  assert.equal(refreshed.shareCount, baseline.shareCount + 1);
  assert.equal(refreshed.comments[0]?.body, commentBody);

  const libraryResponse = await getLibraryRoute(
    new Request("http://127.0.0.1:3000/api/v1/library", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(libraryResponse.status, 200);
  const libraryPayload = await parseJson<{
    library: {
      savedDrops: Array<{
        drop: {
          id: string;
        };
      }>;
    };
  }>(libraryResponse);
  assert.ok(
    libraryPayload.library.savedDrops.some((entry) => entry.drop.id === drop.id),
    "expected saved drop in persisted library snapshot"
  );
});

