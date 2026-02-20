import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

type CheckStatus = "pass" | "fail";

type CheckResult = {
  id: string;
  title: string;
  status: CheckStatus;
  details: string;
};

type SessionPayload = {
  session: {
    sessionToken: string;
    accountId: string;
  };
};

type CatalogPayload = {
  drops: Array<{ id: string }>;
};

type CollectionPayload = {
  collection: {
    ownedDrops: Array<{
      drop: {
        id: string;
      };
      receiptId: string;
    }>;
  };
};

type CheckoutPayload = {
  checkoutSession:
    | {
        status: "already_owned";
        receiptId: string;
      }
    | {
        status: "pending";
        provider: "manual" | "stripe";
        paymentId: string;
      };
};

type PurchasePayload = {
  receipt: {
    id: string;
    status: "completed" | "already_owned" | "refunded";
  };
};

type ReceiptPayload = {
  receipt: {
    id: string;
    dropId: string;
  };
};

type CertificateByReceiptPayload = {
  certificate: {
    id: string;
    receiptId: string;
  };
};

type PublicCertificatePayload = {
  certificate: {
    id: string;
    status: "verified" | "revoked";
  };
};

type EntitlementPayload = {
  hasEntitlement: boolean;
};

type SocialPayload = {
  social: {
    dropId: string;
    comments: Array<{
      body: string;
    }>;
    shareCount: number;
  };
};

type TelemetryPayload = {
  accepted: boolean;
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function expect(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

async function requestJson<T>(
  baseUrl: string,
  pathname: string,
  init: RequestInit = {}
): Promise<{ status: number; data: T }> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${pathname}`, init);
  } catch (error) {
    throw new Error(`request failed for ${pathname}: ${toErrorMessage(error)}`);
  }
  const raw = await response.text();
  let parsed: unknown = null;

  try {
    parsed = raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${pathname}: ${raw || "<empty>"}`);
  }

  return {
    status: response.status,
    data: parsed as T
  };
}

async function writeReport(results: CheckResult[]): Promise<string | null> {
  const reportDir = path.join(process.cwd(), "artifacts");
  const reportPath = path.join(reportDir, "release-candidate-dry-run.latest.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((result) => result.status === "pass").length,
      failed: results.filter((result) => result.status === "fail").length
    },
    results
  };

  try {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    return reportPath;
  } catch {
    return null;
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(
    process.env.OOK_RC_BASE_URL?.trim() || "https://oneofakinde-os.vercel.app"
  );
  const email = `rc-${randomUUID()}@oneofakinde.test`;
  const commentBody = `rc-dry-run-comment-${randomUUID().slice(0, 8)}`;
  const results: CheckResult[] = [];

  let sessionToken = "";
  let accountId = "";
  let targetDropId = "";
  let receiptId = "";
  let certificateId = "";

  async function runCheck(id: string, title: string, run: () => Promise<string>) {
    try {
      const details = await run();
      results.push({ id, title, status: "pass", details });
    } catch (error) {
      results.push({
        id,
        title,
        status: "fail",
        details: toErrorMessage(error)
      });
    }
  }

  await runCheck("rc-01", "health endpoint returns postgres backend", async () => {
    const { data } = await requestJson<{ status: string; backend: string }>(baseUrl, "/api/health");
    expect(data.status === "ok", `expected status=ok, received ${String(data.status)}`);
    expect(data.backend === "postgres", `expected backend=postgres, received ${String(data.backend)}`);
    return "status ok + postgres backend confirmed";
  });

  await runCheck("rc-02", "session creation works for collector", async () => {
    const { status, data } = await requestJson<SessionPayload>(baseUrl, "/api/v1/session/create", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email,
        role: "collector"
      })
    });

    expect(status === 201, `expected 201, received ${status}`);
    expect(data.session?.sessionToken, "expected session token");
    expect(data.session?.accountId, "expected account id");
    sessionToken = data.session.sessionToken;
    accountId = data.session.accountId;
    return `session created for ${accountId}`;
  });

  await runCheck("rc-03", "catalog and collection resolve a purchasable drop", async () => {
    expect(sessionToken, "session token missing from previous step");
    const [catalogResponse, collectionResponse] = await Promise.all([
      requestJson<CatalogPayload>(baseUrl, "/api/v1/catalog/drops"),
      requestJson<CollectionPayload>(baseUrl, "/api/v1/collection", {
        headers: {
          "x-ook-session-token": sessionToken
        }
      })
    ]);

    const drops = catalogResponse.data.drops ?? [];
    const ownedDropIds = new Set((collectionResponse.data.collection?.ownedDrops ?? []).map((entry) => entry.drop.id));
    expect(drops.length > 0, "expected non-empty catalog");

    const candidate = drops.find((drop) => !ownedDropIds.has(drop.id)) ?? drops[0];
    expect(candidate, "expected target drop");
    targetDropId = candidate.id;
    return `target drop ${targetDropId} selected from ${drops.length} catalog drops`;
  });

  await runCheck("rc-04", "checkout + purchase lifecycle succeeds", async () => {
    expect(sessionToken, "session token missing");
    expect(targetDropId, "target drop missing");

    const checkoutResponse = await requestJson<CheckoutPayload>(
      baseUrl,
      `/api/v1/payments/checkout/${encodeURIComponent(targetDropId)}`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": sessionToken,
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      }
    );

    const checkoutSession = checkoutResponse.data.checkoutSession;
    if (checkoutSession.status === "already_owned") {
      receiptId = checkoutSession.receiptId;
      return `drop already owned (receipt ${receiptId})`;
    }

    if (checkoutSession.provider !== "manual") {
      throw new Error(
        `expected manual provider for non-interactive dry-run, received ${checkoutSession.provider}`
      );
    }

    const purchaseResponse = await requestJson<PurchasePayload>(baseUrl, "/api/v1/payments/purchase", {
      method: "POST",
      headers: {
        "x-ook-session-token": sessionToken,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        paymentId: checkoutSession.paymentId
      })
    });

    expect(
      purchaseResponse.data.receipt.status === "completed" ||
        purchaseResponse.data.receipt.status === "already_owned",
      `unexpected receipt status ${purchaseResponse.data.receipt.status}`
    );
    receiptId = purchaseResponse.data.receipt.id;
    return `purchase completed with receipt ${receiptId}`;
  });

  await runCheck("rc-05", "collection reflects purchased ownership", async () => {
    expect(sessionToken, "session token missing");
    expect(targetDropId, "target drop missing");

    const { data } = await requestJson<CollectionPayload>(baseUrl, "/api/v1/collection", {
      headers: {
        "x-ook-session-token": sessionToken
      }
    });

    const ownership = data.collection.ownedDrops.find((entry) => entry.drop.id === targetDropId);
    expect(ownership, `expected drop ${targetDropId} in my collection`);
    if (!receiptId) {
      receiptId = ownership.receiptId;
    }
    return `ownership confirmed for ${targetDropId}`;
  });

  await runCheck("rc-06", "receipt + certificate drilldown works", async () => {
    expect(sessionToken, "session token missing");
    expect(receiptId, "receipt id missing");

    const [receiptResponse, certificateByReceiptResponse] = await Promise.all([
      requestJson<ReceiptPayload>(baseUrl, `/api/v1/receipts/${encodeURIComponent(receiptId)}`, {
        headers: {
          "x-ook-session-token": sessionToken
        }
      }),
      requestJson<CertificateByReceiptPayload>(
        baseUrl,
        `/api/v1/certificates/by-receipt/${encodeURIComponent(receiptId)}`,
        {
          headers: {
            "x-ook-session-token": sessionToken
          }
        }
      )
    ]);

    expect(receiptResponse.data.receipt.id === receiptId, "receipt id mismatch");
    certificateId = certificateByReceiptResponse.data.certificate.id;
    expect(certificateId, "missing certificate id");

    const publicCertificateResponse = await requestJson<PublicCertificatePayload>(
      baseUrl,
      `/api/v1/certificates/${encodeURIComponent(certificateId)}`
    );
    expect(publicCertificateResponse.data.certificate.id === certificateId, "public cert lookup mismatch");
    return `certificate ${certificateId} resolved from receipt ${receiptId}`;
  });

  await runCheck("rc-07", "watch entitlement returns true for owned drop", async () => {
    expect(sessionToken, "session token missing");
    expect(targetDropId, "target drop missing");

    const { data } = await requestJson<EntitlementPayload>(
      baseUrl,
      `/api/v1/entitlements/drops/${encodeURIComponent(targetDropId)}`,
      {
        headers: {
          "x-ook-session-token": sessionToken
        }
      }
    );
    expect(data.hasEntitlement === true, `expected hasEntitlement=true, received ${String(data.hasEntitlement)}`);
    return "entitlement confirmed";
  });

  await runCheck("rc-08", "townhall social events persist through BFF", async () => {
    expect(sessionToken, "session token missing");
    expect(targetDropId, "target drop missing");

    const [commentResponse, shareResponse] = await Promise.all([
      requestJson<SocialPayload>(
        baseUrl,
        `/api/v1/townhall/social/comments/${encodeURIComponent(targetDropId)}`,
        {
          method: "POST",
          headers: {
            "x-ook-session-token": sessionToken,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            body: commentBody
          })
        }
      ),
      requestJson<SocialPayload>(
        baseUrl,
        `/api/v1/townhall/social/shares/${encodeURIComponent(targetDropId)}`,
        {
          method: "POST",
          headers: {
            "x-ook-session-token": sessionToken,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            channel: "internal_dm"
          })
        }
      )
    ]);

    const snapshotResponse = await requestJson<{
      social: {
        byDropId: Record<
          string,
          {
            comments: Array<{ body: string }>;
            shareCount: number;
          }
        >;
      };
    }>(
      baseUrl,
      `/api/v1/townhall/social?drop_ids=${encodeURIComponent(targetDropId)}`,
      {
        headers: {
          "x-ook-session-token": sessionToken
        }
      }
    );

    const dropSocial = snapshotResponse.data.social.byDropId[targetDropId];
    expect(dropSocial, "missing social snapshot for target drop");
    expect(
      dropSocial.comments.some((entry) => entry.body === commentBody),
      "expected persisted comment in social snapshot"
    );
    expect(dropSocial.shareCount >= shareResponse.data.social.shareCount, "share count did not persist");
    return `social persisted (comments=${commentResponse.data.social.comments.length}, shares=${dropSocial.shareCount})`;
  });

  await runCheck("rc-09", "townhall telemetry ingest accepts production signals", async () => {
    expect(sessionToken, "session token missing");
    expect(targetDropId, "target drop missing");

    const [watchResponse, completionResponse, collectIntentResponse] = await Promise.all([
      requestJson<TelemetryPayload>(baseUrl, "/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          dropId: targetDropId,
          eventType: "watch_time",
          watchTimeSeconds: 18.5
        })
      }),
      requestJson<TelemetryPayload>(baseUrl, "/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": sessionToken
        },
        body: JSON.stringify({
          dropId: targetDropId,
          eventType: "completion",
          completionPercent: 100
        })
      }),
      requestJson<TelemetryPayload>(baseUrl, "/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": sessionToken
        },
        body: JSON.stringify({
          dropId: targetDropId,
          eventType: "collect_intent"
        })
      })
    ]);

    expect(watchResponse.data.accepted === true, "watch_time telemetry not accepted");
    expect(completionResponse.data.accepted === true, "completion telemetry not accepted");
    expect(collectIntentResponse.data.accepted === true, "collect_intent telemetry not accepted");
    return "watch_time + completion + collect_intent accepted";
  });

  const reportPath = await writeReport(results);
  console.log(`release-candidate dry run: ${baseUrl}`);
  for (const result of results) {
    const icon = result.status === "pass" ? "PASS" : "FAIL";
    console.log(`[${icon}] ${result.id} ${result.title} :: ${result.details}`);
  }
  if (reportPath) {
    console.log(`report: ${reportPath}`);
  } else {
    console.log("report: not written (filesystem permission denied)");
  }

  const failed = results.filter((result) => result.status === "fail");
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`release-candidate dry run failed: ${toErrorMessage(error)}`);
  process.exit(1);
});
