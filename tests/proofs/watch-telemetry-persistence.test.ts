import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-watch-telemetry-${randomUUID()}.json`);
}

test("proof: watch telemetry logs persist for resume + completion lifecycle", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `watch-telemetry-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drop = await commerceBffService.getDropById("voidrunner");
  assert.ok(drop, "expected seeded watch drop");

  const baselineSignals = await commerceBffService.getTownhallTelemetrySignals([drop.id]);
  const baseline = baselineSignals[drop.id];
  assert.ok(baseline, "expected baseline telemetry signal");

  const events = [
    {
      eventType: "access_start",
      metadata: {
        source: "drop",
        surface: "watch",
        action: "start"
      }
    },
    {
      eventType: "watch_time",
      watchTimeSeconds: 27.4,
      metadata: {
        source: "drop",
        surface: "watch"
      }
    },
    {
      eventType: "quality_change",
      metadata: {
        source: "drop",
        surface: "watch",
        action: "toggle",
        qualityMode: "auto",
        qualityLevel: "medium",
        qualityReason: "auto_step_down_stalled"
      }
    },
    {
      eventType: "rebuffer",
      metadata: {
        source: "drop",
        surface: "watch",
        action: "toggle",
        qualityMode: "auto",
        qualityLevel: "medium",
        rebufferReason: "stalled"
      }
    },
    {
      eventType: "completion",
      completionPercent: 100,
      metadata: {
        source: "drop",
        surface: "watch",
        action: "complete"
      }
    },
    {
      eventType: "access_complete",
      completionPercent: 100,
      metadata: {
        source: "drop",
        surface: "watch",
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
  assert.ok(after, "expected post-watch telemetry signals");
  assert.equal(Number((after.watchTimeSeconds - baseline.watchTimeSeconds).toFixed(2)), 27.4);
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
        qualityMode?: string;
        qualityLevel?: string;
        qualityReason?: string;
        rebufferReason?: string;
      };
    }>;
  };

  const watchEvents = raw.townhallTelemetryEvents.filter(
    (entry) =>
      entry.dropId === drop.id &&
      entry.accountId === session.accountId &&
      entry.metadata?.source === "drop" &&
      entry.metadata?.surface === "watch"
  );

  assert.ok(
    watchEvents.some((entry) => entry.eventType === "access_start" && entry.metadata?.action === "start"),
    "expected watch access_start telemetry event"
  );
  assert.ok(
    watchEvents.some((entry) => entry.eventType === "watch_time" && entry.watchTimeSeconds === 27.4),
    "expected watch watch_time telemetry event"
  );
  assert.ok(
    watchEvents.some(
      (entry) =>
        entry.eventType === "quality_change" &&
        entry.metadata?.qualityLevel === "medium" &&
        entry.metadata?.qualityReason === "auto_step_down_stalled"
    ),
    "expected watch quality_change telemetry event"
  );
  assert.ok(
    watchEvents.some(
      (entry) =>
        entry.eventType === "rebuffer" &&
        entry.metadata?.qualityLevel === "medium" &&
        entry.metadata?.rebufferReason === "stalled"
    ),
    "expected watch rebuffer telemetry event"
  );
  assert.ok(
    watchEvents.some((entry) => entry.eventType === "completion" && entry.completionPercent === 100),
    "expected watch completion telemetry event"
  );
  assert.ok(
    watchEvents.some((entry) => entry.eventType === "access_complete" && entry.metadata?.action === "complete"),
    "expected watch access_complete telemetry event"
  );
});
