import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-listen-telemetry-${randomUUID()}.json`);
}

test("proof: listen telemetry logs persist for background/resume lifecycle", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `listen-telemetry-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drop = await commerceBffService.getDropById("stardust");
  assert.ok(drop, "expected seeded listen drop");

  const baselineSignals = await commerceBffService.getTownhallTelemetrySignals([drop.id]);
  const baseline = baselineSignals[drop.id];
  assert.ok(baseline, "expected baseline telemetry signals");

  const events = [
    {
      eventType: "access_start",
      metadata: {
        source: "drop",
        surface: "listen",
        action: "start"
      }
    },
    {
      eventType: "watch_time",
      watchTimeSeconds: 18.75,
      metadata: {
        source: "drop",
        surface: "listen"
      }
    },
    {
      eventType: "completion",
      completionPercent: 100,
      metadata: {
        source: "drop",
        surface: "listen",
        action: "complete"
      }
    },
    {
      eventType: "access_complete",
      completionPercent: 100,
      metadata: {
        source: "drop",
        surface: "listen",
        action: "complete"
      }
    }
  ] as const;

  for (const payload of events) {
    const response = await postTownhallTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": session.sessionToken
        },
        body: JSON.stringify({
          dropId: drop.id,
          ...payload
        })
      })
    );
    assert.equal(response.status, 202);
  }

  const afterSignals = await commerceBffService.getTownhallTelemetrySignals([drop.id]);
  const after = afterSignals[drop.id];
  assert.ok(after, "expected post-listen telemetry signals");
  assert.equal(Number((after.watchTimeSeconds - baseline.watchTimeSeconds).toFixed(2)), 18.75);
  assert.equal(after.completions - baseline.completions, 1);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    townhallTelemetryEvents: Array<{
      accountId: string | null;
      dropId: string;
      eventType: string;
      watchTimeSeconds: number;
      completionPercent: number;
      metadata: {
        source?: string;
        surface?: string;
        action?: string;
      };
    }>;
  };

  const listenEvents = raw.townhallTelemetryEvents.filter(
    (entry) =>
      entry.dropId === drop.id &&
      entry.accountId === session.accountId &&
      entry.metadata?.source === "drop" &&
      entry.metadata?.surface === "listen"
  );

  assert.ok(
    listenEvents.some((entry) => entry.eventType === "access_start" && entry.metadata?.action === "start"),
    "expected access_start listen telemetry event"
  );
  assert.ok(
    listenEvents.some((entry) => entry.eventType === "watch_time" && entry.watchTimeSeconds === 18.75),
    "expected watch_time listen telemetry event"
  );
  assert.ok(
    listenEvents.some((entry) => entry.eventType === "completion" && entry.completionPercent === 100),
    "expected completion listen telemetry event"
  );
  assert.ok(
    listenEvents.some((entry) => entry.eventType === "access_complete" && entry.metadata?.action === "complete"),
    "expected access_complete listen telemetry event"
  );
});
