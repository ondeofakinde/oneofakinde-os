import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postWatchAccessConsumeRoute } from "../../app/api/v1/watch/access/[drop_id]/consume/route";
import { POST as postWatchAccessIssueRoute } from "../../app/api/v1/watch/access/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-watch-access-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: watch access issue requires entitlement", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_WATCH_ACCESS_TOKEN_TTL_SECONDS;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `watch-denied-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await postWatchAccessIssueRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner", {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );

  assert.equal(response.status, 403);
});

test("proof: watch access token consumes once and blocks replay", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_WATCH_ACCESS_TOKEN_TTL_SECONDS;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `watch-replay-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "expected purchase receipt for entitled watch access");

  const issueResponse = await postWatchAccessIssueRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner", {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(issueResponse.status, 201);

  const issuePayload = await parseJson<{
    watchAccess: {
      token: string;
      expiresAt: string;
    };
  }>(issueResponse);
  assert.ok(issuePayload.watchAccess.token, "expected issued watch access token");
  assert.ok(issuePayload.watchAccess.expiresAt, "expected issued watch access expiry");

  const consumeResponse = await postWatchAccessConsumeRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner/consume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ token: issuePayload.watchAccess.token })
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(consumeResponse.status, 200);

  const consumePayload = await parseJson<{
    watchAccess: {
      granted: boolean;
      tokenId: string;
      expiresAt: string;
    };
  }>(consumeResponse);
  assert.equal(consumePayload.watchAccess.granted, true);

  const replayResponse = await postWatchAccessConsumeRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner/consume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ token: issuePayload.watchAccess.token })
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(replayResponse.status, 403);

  const replayPayload = await parseJson<{
    watchAccess: {
      granted: false;
      reason: string;
    };
  }>(replayResponse);
  assert.equal(replayPayload.watchAccess.granted, false);
  assert.equal(replayPayload.watchAccess.reason, "replayed");
});

test("proof: watch access token expires by TTL", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_WATCH_ACCESS_TOKEN_TTL_SECONDS = "1";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_WATCH_ACCESS_TOKEN_TTL_SECONDS;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `watch-expire-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "expected entitlement before watch token expiry test");

  const issueResponse = await postWatchAccessIssueRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner", {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(issueResponse.status, 201);

  const issuePayload = await parseJson<{
    watchAccess: {
      token: string;
    };
  }>(issueResponse);

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 2_200);
  });

  const consumeResponse = await postWatchAccessConsumeRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner/consume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({ token: issuePayload.watchAccess.token })
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(consumeResponse.status, 403);

  const consumePayload = await parseJson<{
    watchAccess: {
      granted: false;
      reason: string;
    };
  }>(consumeResponse);
  assert.equal(consumePayload.watchAccess.granted, false);
  assert.equal(consumePayload.watchAccess.reason, "expired");
});

test("proof: watch access token enforces account/drop binding", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_WATCH_ACCESS_TOKEN_TTL_SECONDS;
    await fs.rm(dbPath, { force: true });
  });

  const owner = await commerceBffService.createSession({
    email: `watch-owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const attacker = await commerceBffService.createSession({
    email: `watch-attacker-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(owner.accountId, "voidrunner");
  assert.ok(receipt, "expected owner entitlement before binding test");

  const issueResponse = await postWatchAccessIssueRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner", {
      method: "POST",
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(issueResponse.status, 201);

  const issuePayload = await parseJson<{
    watchAccess: {
      token: string;
    };
  }>(issueResponse);

  const attackerConsumeResponse = await postWatchAccessConsumeRoute(
    new Request("http://127.0.0.1:3000/api/v1/watch/access/voidrunner/consume", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": attacker.sessionToken
      },
      body: JSON.stringify({ token: issuePayload.watchAccess.token })
    }),
    withRouteParams({ drop_id: "voidrunner" })
  );
  assert.equal(attackerConsumeResponse.status, 403);

  const attackerConsumePayload = await parseJson<{
    watchAccess: {
      granted: false;
      reason: string;
    };
  }>(attackerConsumeResponse);
  assert.equal(attackerConsumePayload.watchAccess.granted, false);
  assert.equal(attackerConsumePayload.watchAccess.reason, "binding_mismatch");
});
