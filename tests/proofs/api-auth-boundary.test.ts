import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCertificateByReceiptRoute } from "../../app/api/v1/certificates/by-receipt/[receipt_id]/route";
import { GET as getCollectionRoute } from "../../app/api/v1/collection/route";
import { GET as getReceiptRoute } from "../../app/api/v1/receipts/[receipt_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-auth-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: protected api routes require session token", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const response = await getCollectionRoute(new Request("http://127.0.0.1:3000/api/v1/collection"));
  assert.equal(response.status, 401);
});

test("proof: collection identity is session-derived and ignores spoofed account_id", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const owner = await commerceBffService.createSession({
    email: `owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const attacker = await commerceBffService.createSession({
    email: `attacker-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const ownerPurchase = await commerceBffService.purchaseDrop(owner.accountId, "stardust");
  assert.ok(ownerPurchase, "expected owner purchase to succeed");

  const response = await getCollectionRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/collection?account_id=${encodeURIComponent(owner.accountId)}`,
      {
        headers: {
          "x-ook-session-token": attacker.sessionToken
        }
      }
    )
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<{
    collection: {
      account: {
        accountId: string;
      };
      ownedDrops: Array<{ drop: { id: string } }>;
    };
  }>(response);

  assert.equal(payload.collection.account.accountId, attacker.accountId);
  assert.equal(
    payload.collection.ownedDrops.some((entry) => entry.drop.id === "stardust"),
    false,
    "attacker must not receive owner-owned drop"
  );
});

test("proof: cross-account receipt and certificate access is denied", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    await fs.rm(dbPath, { force: true });
  });

  const owner = await commerceBffService.createSession({
    email: `owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const attacker = await commerceBffService.createSession({
    email: `attacker-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(owner.accountId, "voidrunner");
  assert.ok(receipt, "expected owner receipt");
  if (!receipt) {
    return;
  }

  const ownerReceiptResponse = await getReceiptRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${receipt.id}`, {
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    }),
    withRouteParams({ receipt_id: receipt.id })
  );
  assert.equal(ownerReceiptResponse.status, 200);

  const attackerReceiptResponse = await getReceiptRoute(
    new Request(`http://127.0.0.1:3000/api/v1/receipts/${receipt.id}`, {
      headers: {
        "x-ook-session-token": attacker.sessionToken
      }
    }),
    withRouteParams({ receipt_id: receipt.id })
  );
  assert.equal(attackerReceiptResponse.status, 404);

  const ownerCertificateResponse = await getCertificateByReceiptRoute(
    new Request(`http://127.0.0.1:3000/api/v1/certificates/by-receipt/${receipt.id}`, {
      headers: {
        "x-ook-session-token": owner.sessionToken
      }
    }),
    withRouteParams({ receipt_id: receipt.id })
  );
  assert.equal(ownerCertificateResponse.status, 200);

  const attackerCertificateResponse = await getCertificateByReceiptRoute(
    new Request(`http://127.0.0.1:3000/api/v1/certificates/by-receipt/${receipt.id}`, {
      headers: {
        "x-ook-session-token": attacker.sessionToken
      }
    }),
    withRouteParams({ receipt_id: receipt.id })
  );
  assert.equal(attackerCertificateResponse.status, 404);
});
