import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { commerceGateway } from "../../lib/adapters/mock-commerce";
import { evaluateRoutePolicy } from "../../lib/route-policy";

test("integration proof: drop -> buy -> my collection -> certificate -> watch", async () => {
  const email = `integration-${randomUUID()}@oneofakinde.test`;
  const session = await commerceGateway.createSession({
    email,
    role: "collector"
  });

  const drops = await commerceGateway.listDrops();
  const drop = drops[0];
  assert.ok(drop, "expected at least one drop in the catalog");

  const dropPath = `/drops/${drop.id}`;
  const buyPath = `/pay/buy/${drop.id}`;
  const collectionPath = "/my-collection";
  const watchPath = `/drops/${drop.id}/watch`;

  const dropPolicyPublic = evaluateRoutePolicy({
    pathname: dropPath,
    search: "",
    hasSession: false
  });
  assert.equal(dropPolicyPublic.kind, "next");

  const buyPolicyNoSession = evaluateRoutePolicy({
    pathname: buyPath,
    search: "",
    hasSession: false
  });
  assert.equal(buyPolicyNoSession.kind, "redirect");
  if (buyPolicyNoSession.kind === "redirect") {
    assert.equal(buyPolicyNoSession.pathname, "/auth/sign-in");
  }

  const buyPolicyWithSession = evaluateRoutePolicy({
    pathname: buyPath,
    search: "",
    hasSession: true
  });
  assert.equal(buyPolicyWithSession.kind, "next");

  const checkout = await commerceGateway.getCheckoutPreview(session.accountId, drop.id);
  assert.ok(checkout, "expected checkout preview to exist");
  assert.ok((checkout?.totalUsd ?? 0) > 0, "expected payable total before purchase");

  const receipt = await commerceGateway.purchaseDrop(session.accountId, drop.id);
  assert.ok(receipt, "expected receipt after purchase");
  assert.equal(receipt?.status, "completed");

  const collectionPolicyWithSession = evaluateRoutePolicy({
    pathname: collectionPath,
    search: receipt ? `?receipt=${encodeURIComponent(receipt.id)}` : "",
    hasSession: true
  });
  assert.equal(collectionPolicyWithSession.kind, "next");
  if (collectionPolicyWithSession.kind === "next") {
    assert.equal(collectionPolicyWithSession.headers["x-ook-surface-key"], "my_collection_owned");
  }

  const collection = await commerceGateway.getMyCollection(session.accountId);
  assert.ok(collection, "expected my collection snapshot");

  const owned = collection?.ownedDrops.find((entry) => entry.drop.id === drop.id);
  assert.ok(owned, "expected purchased drop in my collection");

  const receiptLookup = receipt
    ? await commerceGateway.getReceipt(session.accountId, receipt.id)
    : null;
  assert.ok(receiptLookup, "expected receipt lookup to succeed");

  const certificateFromReceipt = receipt
    ? await commerceGateway.getCertificateByReceipt(session.accountId, receipt.id)
    : null;
  assert.ok(certificateFromReceipt, "expected certificate from receipt lookup");

  const certificateById = owned
    ? await commerceGateway.getCertificateById(owned.certificateId)
    : null;
  assert.ok(certificateById, "expected certificate lookup by id");
  assert.equal(certificateById?.dropId, drop.id);
  assert.equal(certificateFromReceipt?.id, certificateById?.id);

  const entitlement = await commerceGateway.hasDropEntitlement(session.accountId, drop.id);
  assert.equal(entitlement, true, "expected watch entitlement after purchase");

  const watchPolicyNoSession = evaluateRoutePolicy({
    pathname: watchPath,
    search: "",
    hasSession: false
  });
  assert.equal(watchPolicyNoSession.kind, "redirect");

  const watchPolicyWithSession = evaluateRoutePolicy({
    pathname: watchPath,
    search: "",
    hasSession: true
  });
  assert.equal(watchPolicyWithSession.kind, "next");
  if (watchPolicyWithSession.kind === "next") {
    assert.equal(watchPolicyWithSession.headers["x-ook-surface-key"], "drop_full_watch");
  }
});
