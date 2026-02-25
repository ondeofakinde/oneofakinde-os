import assert from "node:assert/strict";
import test from "node:test";
import type { CollectOffer } from "../../lib/domain/contracts";
import {
  applyCollectOfferAction,
  canApplyCollectOfferAction,
  getAllowedCollectOfferActions
} from "../../lib/collect/offer-state-machine";

function createOffer(): CollectOffer {
  return {
    id: "offer_stardust_1",
    dropId: "stardust",
    listingType: "auction",
    amountUsd: 3.25,
    state: "listed",
    actorHandle: "collector_demo",
    createdAt: "2026-02-20T00:00:00.000Z",
    updatedAt: "2026-02-20T00:00:00.000Z",
    expiresAt: "2026-02-27T00:00:00.000Z"
  };
}

test("proof: collect offer state machine advances through valid transitions", () => {
  const listed = createOffer();
  assert.equal(canApplyCollectOfferAction(listed.state, "submit_offer"), true);

  const submitted = applyCollectOfferAction(listed, "submit_offer", {
    amountUsd: 3.5,
    updatedAt: "2026-02-20T00:01:00.000Z"
  });
  assert.equal(submitted.state, "offer_submitted");
  assert.equal(submitted.amountUsd, 3.5);

  const countered = applyCollectOfferAction(submitted, "counter_offer", {
    amountUsd: 3.9,
    updatedAt: "2026-02-20T00:02:00.000Z"
  });
  assert.equal(countered.state, "countered");

  const accepted = applyCollectOfferAction(countered, "accept_offer", {
    updatedAt: "2026-02-20T00:03:00.000Z"
  });
  assert.equal(accepted.state, "accepted");

  const settled = applyCollectOfferAction(accepted, "settle_offer", {
    updatedAt: "2026-02-20T00:04:00.000Z"
  });
  assert.equal(settled.state, "settled");
  assert.deepEqual(getAllowedCollectOfferActions(settled.state), []);
});

test("proof: collect offer state machine rejects invalid transition edges", () => {
  const listed = createOffer();
  assert.equal(canApplyCollectOfferAction(listed.state, "settle_offer"), false);

  assert.throws(
    () => applyCollectOfferAction(listed, "settle_offer"),
    /invalid offer transition/
  );

  const submitted = applyCollectOfferAction(listed, "submit_offer");
  const withdrawn = applyCollectOfferAction(submitted, "withdraw_offer");
  assert.equal(withdrawn.state, "withdrawn");
  assert.throws(
    () => applyCollectOfferAction(withdrawn, "accept_offer"),
    /invalid offer transition/
  );
});
