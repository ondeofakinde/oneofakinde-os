import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-townhall-telemetry-${randomUUID()}.json`);
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: townhall telemetry events persist and aggregate for ranking", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `townhall-telemetry-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drop = await commerceBffService.getDropById("voidrunner");
  assert.ok(drop, "expected telemetry test drop");

  const invalidWatchPayloadResponse = await postTownhallTelemetryRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        dropId: drop.id,
        eventType: "watch_time",
        watchTimeSeconds: 0
      })
    })
  );
  assert.equal(invalidWatchPayloadResponse.status, 400);

  const watchTimeResponse = await postTownhallTelemetryRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        dropId: drop.id,
        eventType: "watch_time",
        watchTimeSeconds: 21.4
      })
    })
  );
  assert.equal(watchTimeResponse.status, 202);

  const completionResponse = await postTownhallTelemetryRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        dropId: drop.id,
        eventType: "completion",
        completionPercent: 100
      })
    })
  );
  assert.equal(completionResponse.status, 202);

  const collectIntentResponse = await postTownhallTelemetryRoute(
    new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        dropId: drop.id,
        eventType: "collect_intent"
      })
    })
  );
  assert.equal(collectIntentResponse.status, 202);
  const collectPayload = await parseJson<{ accepted: boolean }>(collectIntentResponse);
  assert.equal(collectPayload.accepted, true);

  const signals = await commerceBffService.getTownhallTelemetrySignals([drop.id]);
  assert.equal(signals[drop.id]?.completions, 1);
  assert.equal(signals[drop.id]?.collectIntents, 1);
  assert.equal(signals[drop.id]?.watchTimeSeconds, 21.4);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    townhallTelemetryEvents: Array<{
      dropId: string;
      eventType: string;
      accountId: string | null;
    }>;
  };

  const dropEvents = raw.townhallTelemetryEvents.filter((entry) => entry.dropId === drop.id);
  assert.equal(dropEvents.length, 3);
  assert.ok(dropEvents.some((entry) => entry.eventType === "watch_time" && entry.accountId === null));
  assert.ok(dropEvents.some((entry) => entry.eventType === "completion" && entry.accountId === session.accountId));
  assert.ok(
    dropEvents.some((entry) => entry.eventType === "collect_intent" && entry.accountId === session.accountId)
  );
});
