import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getDropLineageRoute } from "../../app/api/v1/drops/[drop_id]/lineage/route";
import { POST as postDropVersionRoute } from "../../app/api/v1/workshop/drops/[drop_id]/versions/route";
import { POST as postDropDerivativeRoute } from "../../app/api/v1/workshop/drops/[drop_id]/derivatives/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-drop-lineage-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: public drop lineage route is stable and public-safe", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const response = await getDropLineageRoute(
    new Request("http://127.0.0.1:3000/api/v1/drops/stardust/lineage", {
      method: "GET"
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<{
    lineage: {
      dropId: string;
      versions: Array<{ id: string; label: string; createdByHandle: string }>;
      derivatives: Array<{
        id: string;
        sourceDropId: string;
        derivativeDropId: string;
        revenueSplits: Array<{ recipientHandle: string; sharePercent: number }>;
      }>;
    };
  }>(response);

  assert.equal(payload.lineage.dropId, "stardust");
  assert.equal(payload.lineage.versions.length > 0, true);
  assert.equal(payload.lineage.derivatives.length > 0, true);

  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("accountId"), false);
});

test("proof: creator-only lineage writes enforce split policy and keep collect flow intact", async (t) => {
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
    email: "collector@oneofakinde.com",
    role: "collector"
  });

  const forbiddenVersion = await postDropVersionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops/stardust/versions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        label: "director_cut",
        notes: "collector attempt should fail"
      })
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(forbiddenVersion.status, 403);

  const createdVersionResponse = await postDropVersionRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops/stardust/versions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        label: "director_cut",
        notes: "new cinematic cut",
        releasedAt: "2026-03-10T18:30:00.000Z"
      })
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(createdVersionResponse.status, 201);
  const createdVersionPayload = await parseJson<{
    version: { dropId: string; label: string; notes: string | null };
  }>(createdVersionResponse);
  assert.equal(createdVersionPayload.version.dropId, "stardust");
  assert.equal(createdVersionPayload.version.label, "director_cut");

  const invalidDerivativeResponse = await postDropDerivativeRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops/stardust/derivatives", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        derivativeDropId: "voidrunner",
        kind: "remix",
        attribution: "voidrunner remix from stardust",
        revenueSplits: [
          {
            recipientHandle: "oneofakinde",
            sharePercent: 90
          }
        ]
      })
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(invalidDerivativeResponse.status, 400);

  const createdDerivativeResponse = await postDropDerivativeRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/drops/stardust/derivatives", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        derivativeDropId: "voidrunner",
        kind: "remix",
        attribution: "voidrunner remix from stardust",
        revenueSplits: [
          {
            recipientHandle: "oneofakinde",
            sharePercent: 70
          },
          {
            recipientHandle: "collector_demo",
            sharePercent: 30
          }
        ]
      })
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(createdDerivativeResponse.status, 201);
  const createdDerivativePayload = await parseJson<{
    derivative: { sourceDropId: string; derivativeDropId: string };
  }>(createdDerivativeResponse);
  assert.equal(createdDerivativePayload.derivative.sourceDropId, "stardust");
  assert.equal(createdDerivativePayload.derivative.derivativeDropId, "voidrunner");

  const lineageResponse = await getDropLineageRoute(
    new Request("http://127.0.0.1:3000/api/v1/drops/stardust/lineage", {
      method: "GET"
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(lineageResponse.status, 200);
  const lineagePayload = await parseJson<{
    lineage: {
      versions: Array<{ label: string }>;
      derivatives: Array<{ derivativeDropId: string; kind: string }>;
    };
  }>(lineageResponse);
  assert.equal(
    lineagePayload.lineage.versions.some((version) => version.label === "director_cut"),
    true
  );
  assert.equal(
    lineagePayload.lineage.derivatives.some(
      (entry) => entry.derivativeDropId === "voidrunner" && entry.kind === "remix"
    ),
    true
  );

  const receipt = await commerceBffService.purchaseDrop(collector.accountId, "twilight-whispers");
  assert.equal(Boolean(receipt), true);
});
