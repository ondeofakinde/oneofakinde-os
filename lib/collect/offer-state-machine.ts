import type { CollectOffer, CollectOfferAction, CollectOfferState } from "@/lib/domain/contracts";

const STATE_TRANSITIONS: Record<CollectOfferState, CollectOfferAction[]> = {
  listed: ["submit_offer", "expire_offer"],
  offer_submitted: ["counter_offer", "accept_offer", "withdraw_offer", "expire_offer"],
  countered: ["accept_offer", "withdraw_offer", "expire_offer"],
  accepted: ["settle_offer", "expire_offer"],
  settled: [],
  expired: [],
  withdrawn: []
};

function hasAction(state: CollectOfferState, action: CollectOfferAction): boolean {
  return STATE_TRANSITIONS[state].includes(action);
}

function nextStateFor(action: CollectOfferAction): CollectOfferState {
  if (action === "submit_offer") return "offer_submitted";
  if (action === "counter_offer") return "countered";
  if (action === "accept_offer") return "accepted";
  if (action === "settle_offer") return "settled";
  if (action === "expire_offer") return "expired";
  return "withdrawn";
}

export function getAllowedCollectOfferActions(state: CollectOfferState): CollectOfferAction[] {
  return [...STATE_TRANSITIONS[state]];
}

export function canApplyCollectOfferAction(
  state: CollectOfferState,
  action: CollectOfferAction
): boolean {
  return hasAction(state, action);
}

export function applyCollectOfferAction(
  offer: CollectOffer,
  action: CollectOfferAction,
  options?: {
    amountUsd?: number;
    updatedAt?: string;
    expiresAt?: string | null;
  }
): CollectOffer {
  if (!hasAction(offer.state, action)) {
    throw new Error(`invalid offer transition: ${offer.state} -> ${action}`);
  }

  const nextState = nextStateFor(action);
  const updatedAt = options?.updatedAt ?? new Date().toISOString();

  return {
    ...offer,
    amountUsd: options?.amountUsd ?? offer.amountUsd,
    state: nextState,
    updatedAt,
    expiresAt: options?.expiresAt ?? offer.expiresAt
  };
}
