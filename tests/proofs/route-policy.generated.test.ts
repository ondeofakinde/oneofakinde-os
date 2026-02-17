import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRoutePolicy } from "../../lib/route-policy";

const redirectCases = [
  {
    "sourcePathname": "/collections",
    "targetPathname": "/worlds"
  },
  {
    "sourcePathname": "/network-setup",
    "targetPathname": "/space-setup"
  },
  {
    "sourcePathname": "/creators/handle-sample",
    "targetPathname": "/studios/handle-sample"
  },
  {
    "sourcePathname": "/collections/id-sample",
    "targetPathname": "/worlds/id-sample"
  },
  {
    "sourcePathname": "/collections/id-sample/titles",
    "targetPathname": "/worlds/id-sample/drops"
  },
  {
    "sourcePathname": "/assets/id-sample",
    "targetPathname": "/drops/id-sample"
  },
  {
    "sourcePathname": "/assets/id-sample/details",
    "targetPathname": "/drops/id-sample/details"
  },
  {
    "sourcePathname": "/assets/id-sample/properties",
    "targetPathname": "/drops/id-sample/properties"
  },
  {
    "sourcePathname": "/assets/id-sample/offers",
    "targetPathname": "/drops/id-sample/offers"
  },
  {
    "sourcePathname": "/assets/id-sample/activity",
    "targetPathname": "/drops/id-sample/activity"
  },
  {
    "sourcePathname": "/assets/id-sample/preview",
    "targetPathname": "/drops/id-sample/preview"
  },
  {
    "sourcePathname": "/assets/id-sample/preview/gallery",
    "targetPathname": "/drops/id-sample/preview/photos"
  },
  {
    "sourcePathname": "/assets/id-sample/watch",
    "targetPathname": "/drops/id-sample/watch"
  },
  {
    "sourcePathname": "/assets/id-sample/listen",
    "targetPathname": "/drops/id-sample/listen"
  },
  {
    "sourcePathname": "/assets/id-sample/read",
    "targetPathname": "/drops/id-sample/read"
  },
  {
    "sourcePathname": "/assets/id-sample/view",
    "targetPathname": "/drops/id-sample/photos"
  },
  {
    "sourcePathname": "/my-assets",
    "targetPathname": "/my-collection"
  },
  {
    "sourcePathname": "/owned-assets",
    "targetPathname": "/my-collection"
  },
  {
    "sourcePathname": "/owned",
    "targetPathname": "/my-collection"
  },
  {
    "sourcePathname": "/saved",
    "targetPathname": "/library"
  },
  {
    "sourcePathname": "/bookmarks",
    "targetPathname": "/library"
  },
  {
    "sourcePathname": "/studio",
    "targetPathname": "/workshop"
  }
] as const;
const metadataCases = [
  {
    "pathname": "/",
    "surfaceKey": "home",
    "publicSafe": "true"
  },
  {
    "pathname": "/explore",
    "surfaceKey": "explore",
    "publicSafe": "true"
  },
  {
    "pathname": "/worlds",
    "surfaceKey": "world_index",
    "publicSafe": "true"
  },
  {
    "pathname": "/watch",
    "surfaceKey": "watch_hub",
    "publicSafe": "true"
  },
  {
    "pathname": "/listen",
    "surfaceKey": "listen_hub",
    "publicSafe": "true"
  },
  {
    "pathname": "/read",
    "surfaceKey": "read_hub",
    "publicSafe": "true"
  },
  {
    "pathname": "/live-now",
    "surfaceKey": "live_now_hub",
    "publicSafe": "true"
  },
  {
    "pathname": "/auth/sign-in",
    "surfaceKey": "auth_sign_in",
    "publicSafe": "true"
  },
  {
    "pathname": "/auth/sign-up",
    "surfaceKey": "auth_sign_up",
    "publicSafe": "true"
  },
  {
    "pathname": "/logout",
    "surfaceKey": "logout",
    "publicSafe": "false"
  },
  {
    "pathname": "/space-setup",
    "surfaceKey": "first_run_space_setup",
    "publicSafe": "false"
  },
  {
    "pathname": "/studios/handle-sample",
    "surfaceKey": "studio_public",
    "publicSafe": "true"
  },
  {
    "pathname": "/worlds/id-sample",
    "surfaceKey": "world_detail",
    "publicSafe": "true"
  },
  {
    "pathname": "/worlds/id-sample/drops",
    "surfaceKey": "world_drops_table",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample",
    "surfaceKey": "drop_detail",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/details",
    "surfaceKey": "drop_details",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/properties",
    "surfaceKey": "drop_properties",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/offers",
    "surfaceKey": "drop_offers",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/activity",
    "surfaceKey": "drop_activity",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/preview",
    "surfaceKey": "drop_preview_generic",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/preview/photos",
    "surfaceKey": "drop_preview_photos",
    "publicSafe": "true"
  },
  {
    "pathname": "/drops/id-sample/watch",
    "surfaceKey": "drop_full_watch",
    "publicSafe": "false"
  },
  {
    "pathname": "/drops/id-sample/listen",
    "surfaceKey": "drop_full_listen",
    "publicSafe": "false"
  },
  {
    "pathname": "/drops/id-sample/read",
    "surfaceKey": "drop_full_read",
    "publicSafe": "false"
  },
  {
    "pathname": "/drops/id-sample/photos",
    "surfaceKey": "drop_full_photos",
    "publicSafe": "false"
  },
  {
    "pathname": "/pay/buy/drop_id-sample",
    "surfaceKey": "pay_buy_drop",
    "publicSafe": "false"
  },
  {
    "pathname": "/my-collection",
    "surfaceKey": "my_collection_owned",
    "publicSafe": "false"
  },
  {
    "pathname": "/library",
    "surfaceKey": "library_saved",
    "publicSafe": "false"
  },
  {
    "pathname": "/certificates/cert_id-sample",
    "surfaceKey": "certificate_verify",
    "publicSafe": "true"
  },
  {
    "pathname": "/workshop",
    "surfaceKey": "workshop_root",
    "publicSafe": "false"
  }
] as const;
const sessionCases = [
  {
    "pathname": "/logout"
  },
  {
    "pathname": "/space-setup"
  },
  {
    "pathname": "/drops/id-sample/watch"
  },
  {
    "pathname": "/drops/id-sample/listen"
  },
  {
    "pathname": "/drops/id-sample/read"
  },
  {
    "pathname": "/drops/id-sample/photos"
  },
  {
    "pathname": "/pay/buy/drop_id-sample"
  },
  {
    "pathname": "/my-collection"
  },
  {
    "pathname": "/library"
  },
  {
    "pathname": "/workshop"
  }
] as const;

test("generated legacy redirects map to canonical pathnames", () => {
  for (const testCase of redirectCases) {
    const decision = evaluateRoutePolicy({
      pathname: testCase.sourcePathname,
      search: "",
      hasSession: true
    });

    assert.equal(decision.kind, "redirect");
    if (decision.kind === "redirect") {
      assert.equal(decision.status, 308);
      assert.equal(decision.pathname, testCase.targetPathname);
    }
  }
});

test("generated route metadata headers match surface definitions", () => {
  for (const testCase of metadataCases) {
    const decision = evaluateRoutePolicy({
      pathname: testCase.pathname,
      search: "",
      hasSession: true
    });

    assert.equal(decision.kind, "next");
    if (decision.kind === "next") {
      assert.equal(decision.headers["x-ook-surface-key"], testCase.surfaceKey);
      assert.equal(decision.headers["x-ook-public-safe"], testCase.publicSafe);
    }
  }
});

test("generated session-required surfaces redirect when session is missing", () => {
  for (const testCase of sessionCases) {
    const decision = evaluateRoutePolicy({
      pathname: testCase.pathname,
      search: "",
      hasSession: false
    });

    assert.equal(decision.kind, "redirect");
    if (decision.kind === "redirect") {
      assert.equal(decision.status, 307);
      assert.equal(decision.pathname, "/auth/sign-in");
      assert.equal(decision.searchParams.returnTo, testCase.pathname);
    }
  }
});
