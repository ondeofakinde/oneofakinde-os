import { getRequestSession, requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  forbidden,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { CollectOfferAction } from "@/lib/domain/contracts";

type CollectDropOffersRouteParams = {
  drop_id: string;
};

export async function GET(
  request: Request,
  context: RouteContext<CollectDropOffersRouteParams>
) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  const session = await getRequestSession(request);
  const collect = await commerceBffService.getCollectDropOffers(
    dropId,
    session?.accountId ?? null
  );
  if (!collect) {
    return notFound("drop not found");
  }

  return ok({
    viewer: session
      ? {
          accountId: session.accountId,
          handle: session.handle
        }
      : null,
    dropId,
    listing: collect.listing,
    offers: collect.offers
  });
}

type PostCollectOffersBody = {
  action?: string;
  amountUsd?: number;
  offerId?: string;
  executionPriceUsd?: number;
};

function parseOptionalExecutionPriceUsd(body: Record<string, unknown> | null): {
  ok: true;
  value: number | undefined;
} | {
  ok: false;
  response: Response;
} {
  const rawExecutionPrice = body?.executionPriceUsd;
  if (rawExecutionPrice === undefined) {
    return {
      ok: true,
      value: undefined
    };
  }

  if (
    typeof rawExecutionPrice !== "number" ||
    !Number.isFinite(rawExecutionPrice) ||
    rawExecutionPrice <= 0
  ) {
    return {
      ok: false,
      response: badRequest("executionPriceUsd must be a positive number")
    };
  }

  return {
    ok: true,
    value: rawExecutionPrice
  };
}

function isCollectOfferAction(value: string): value is CollectOfferAction {
  return (
    value === "submit_offer" ||
    value === "counter_offer" ||
    value === "accept_offer" ||
    value === "settle_offer" ||
    value === "expire_offer" ||
    value === "withdraw_offer"
  );
}

export async function POST(
  request: Request,
  context: RouteContext<CollectDropOffersRouteParams>
) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await safeJson<PostCollectOffersBody>(request)) as Record<string, unknown> | null;
  const action = getRequiredBodyString(body, "action");
  if (!action) {
    return badRequest("action is required");
  }
  const parsedExecutionPrice = parseOptionalExecutionPriceUsd(body);
  if (!parsedExecutionPrice.ok) {
    return parsedExecutionPrice.response;
  }

  if (action === "submit_resale_fixed_offer") {
    const rawAmount = body?.amountUsd;
    if (typeof rawAmount !== "number" || !Number.isFinite(rawAmount) || rawAmount <= 0) {
      return badRequest("amountUsd must be a positive number");
    }

    const submitted = await commerceBffService.submitCollectResaleOffer({
      accountId: guard.session.accountId,
      dropId,
      amountUsd: rawAmount
    });

    if (!submitted) {
      return badRequest("resale offer cannot be submitted for this drop");
    }

    return ok(
      {
        dropId,
        listing: submitted.listing,
        offers: submitted.offers
      },
      201
    );
  }

  if (action === "accept_latest_resale_offer" || action === "settle_latest_resale_offer") {
    if (!guard.session.roles.includes("creator")) {
      return forbidden("creator role is required");
    }

    const current = await commerceBffService.getCollectDropOffers(dropId, guard.session.accountId);
    if (!current || current.offers.length === 0) {
      return notFound("offer not found");
    }

    const latestOfferId = current.offers[0]?.id;
    if (!latestOfferId) {
      return notFound("offer not found");
    }

    const transitionAction: CollectOfferAction =
      action === "accept_latest_resale_offer" ? "accept_offer" : "settle_offer";

    const transitioned = await commerceBffService.transitionCollectOffer({
      accountId: guard.session.accountId,
      offerId: latestOfferId,
      action: transitionAction,
      executionPriceUsd: parsedExecutionPrice.value
    });

    if (!transitioned) {
      return badRequest("offer transition rejected");
    }

    return ok({
      dropId,
      listing: transitioned.listing,
      offers: transitioned.offers
    });
  }

  if (!isCollectOfferAction(action)) {
    return badRequest("unsupported action");
  }

  const offerId = getRequiredBodyString(body, "offerId");
  if (!offerId) {
    return badRequest("offerId is required");
  }
  const current = await commerceBffService.getCollectDropOffers(dropId, guard.session.accountId);
  if (!current) {
    return notFound("drop not found");
  }
  if (!current.offers.some((offer) => offer.id === offerId)) {
    return notFound("offer not found");
  }

  const transitioned = await commerceBffService.transitionCollectOffer({
    accountId: guard.session.accountId,
    offerId,
    action,
    executionPriceUsd: parsedExecutionPrice.value
  });

  if (!transitioned) {
    return badRequest("offer transition rejected");
  }

  return ok({
    dropId,
    listing: transitioned.listing,
    offers: transitioned.offers
  });
}
