import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postTownhallTelemetryRoute } from "../../app/api/v1/townhall/telemetry/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-townhall-telemetry-integrity-${randomUUID()}.json`);
}

test("proof: non-scoring telemetry events persist without distorting ranking signals", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const drop = await commerceBffService.getDropById("stardust");
  assert.ok(drop, "expected seeded drop");

  const baseline = await commerceBffService.getTownhallTelemetrySignals([drop.id]);

  const payloads = [
    {
      dropId: drop.id,
      eventType: "showroom_impression",
      metadata: {
        source: "showroom",
        surface: "townhall",
        mediaFilter: "watch",
        ordering: "rising",
        position: 1,
        action: "start",
        ignoredField: "noop"
      }
    },
    {
      dropId: drop.id,
      eventType: "preview_start",
      metadata: {
        source: "showroom",
        surface: "watch",
        action: "start"
      }
    },
    {
      dropId: drop.id,
      eventType: "interaction_comment",
      metadata: {
        source: "drop",
        surface: "townhall",
        action: "submit",
        position: 1
      }
    },
    {
      dropId: drop.id,
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
      dropId: drop.id,
      eventType: "rebuffer",
      metadata: {
        source: "drop",
        surface: "watch",
        action: "toggle",
        qualityMode: "auto",
        qualityLevel: "medium",
        rebufferReason: "stalled"
      }
    }
  ];

  for (const payload of payloads) {
    const response = await postTownhallTelemetryRoute(
      new Request("http://127.0.0.1:3000/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      })
    );
    assert.equal(response.status, 202);
  }

  const after = await commerceBffService.getTownhallTelemetrySignals([drop.id]);
  assert.equal(after[drop.id]?.watchTimeSeconds, baseline[drop.id]?.watchTimeSeconds);
  assert.equal(after[drop.id]?.completions, baseline[drop.id]?.completions);
  assert.equal(after[drop.id]?.collectIntents, baseline[drop.id]?.collectIntents);
  assert.equal(after[drop.id]?.impressions, baseline[drop.id]?.impressions);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    townhallTelemetryEvents: Array<{
      dropId: string;
      eventType: string;
      metadata?: Record<string, unknown>;
    }>;
  };

  const events = raw.townhallTelemetryEvents.filter((entry) => entry.dropId === drop.id);
  assert.equal(events.length, 8);
  const interaction = events.find((entry) => entry.eventType === "interaction_comment");
  assert.equal(interaction?.metadata?.action, "submit");
  const qualityChange = events.find((entry) => entry.eventType === "quality_change");
  assert.equal(qualityChange?.metadata?.qualityLevel, "medium");
  const rebuffer = events.find((entry) => entry.eventType === "rebuffer");
  assert.equal(rebuffer?.metadata?.rebufferReason, "stalled");
  assert.ok(!("ignoredField" in (events.find((entry) => entry.eventType === "showroom_impression")?.metadata ?? {})));
});
