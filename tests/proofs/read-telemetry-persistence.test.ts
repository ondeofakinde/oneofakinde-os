import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-read-telemetry-${randomUUID()}.json`);
}

test("proof: read telemetry logs persist for progress and completion lifecycle", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `read-telemetry-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drop = await commerceBffService.getDropById("through-the-lens");
  assert.ok(drop, "expected seeded read drop");

  const baselineSignals = await commerceBffService.getTownhallTelemetrySignals([drop.id]);
  const baseline = baselineSignals[drop.id];
  assert.ok(baseline, "expected baseline telemetry signal");

  const events = [
    {
      eventType: "access_start",
      metadata: {
        source: "drop",
        surface: "read",
        action: "start",
        position: 1
      }
    },
    {
      eventType: "drop_dwell_time",
      watchTimeSeconds: 26.5,
      metadata: {
        source: "drop",
        surface: "read",
        position: 2
      }
    },
    {
      eventType: "completion",
      completionPercent: 100,
      metadata: {
        source: "drop",
        surface: "read",
        action: "complete",
        position: 3
      }
    },
    {
      eventType: "access_complete",
      completionPercent: 100,
      metadata: {
        source: "drop",
        surface: "read",
        action: "complete",
        position: 3
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
  assert.ok(after, "expected post-read telemetry signals");
  assert.equal(Number((after.watchTimeSeconds - baseline.watchTimeSeconds).toFixed(2)), 0);
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
        position?: number;
      };
    }>;
  };

  const readEvents = raw.townhallTelemetryEvents.filter(
    (entry) =>
      entry.dropId === drop.id &&
      entry.accountId === session.accountId &&
      entry.metadata?.source === "drop" &&
      entry.metadata?.surface === "read"
  );
  assert.ok(
    readEvents.some((entry) => entry.eventType === "access_start" && entry.metadata?.action === "start"),
    "expected read access_start telemetry event"
  );
  assert.ok(
    readEvents.some((entry) => entry.eventType === "drop_dwell_time" && entry.watchTimeSeconds === 26.5),
    "expected read dwell telemetry event"
  );
  assert.ok(
    readEvents.some((entry) => entry.eventType === "completion" && entry.completionPercent === 100),
    "expected read completion telemetry event"
  );
  assert.ok(
    readEvents.some((entry) => entry.eventType === "access_complete" && entry.metadata?.action === "complete"),
    "expected read access_complete telemetry event"
  );
});
