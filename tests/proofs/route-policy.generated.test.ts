import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRoutePolicy } from "../../lib/route-policy";

const redirectCases = [
  {
    "sourcePathname": "/photos",
    "targetPathname": "/gallery"
  },
  {
    "sourcePathname": "/live-now",
    "targetPathname": "/live"
  },
  {
    "sourcePathname": "/space-setup",
    "targetPathname": "/onboarding/profile-setup"
  },
  {
    "sourcePathname": "/studios/handle-sample",
    "targetPathname": "/studio/handle-sample"
  },
  {
    "sourcePathname": "/creators/handle-sample",
    "targetPathname": "/studio/handle-sample"
  },
  {
    "sourcePathname": "/collections",
    "targetPathname": "/worlds"
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
    "sourcePathname": "/drops/id-sample/preview/photos",
    "targetPathname": "/drops/id-sample/preview/gallery"
  },
  {
    "sourcePathname": "/assets/id-sample/preview/photos",
    "targetPathname": "/drops/id-sample/preview/gallery"
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
    "sourcePathname": "/drops/id-sample/photos",
    "targetPathname": "/drops/id-sample/gallery"
  },
  {
    "sourcePathname": "/assets/id-sample/photos",
    "targetPathname": "/drops/id-sample/gallery"
  },
  {
    "sourcePathname": "/assets/id-sample/view",
    "targetPathname": "/drops/id-sample/gallery"
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
    "sourcePathname": "/library",
    "targetPathname": "/favorites"
  },
  {
    "sourcePathname": "/saved",
    "targetPathname": "/favorites"
  },
  {
    "sourcePathname": "/bookmarks",
    "targetPathname": "/favorites"
  },
  {
    "sourcePathname": "/studio",
    "targetPathname": "/workshop"
  },
  {
    "sourcePathname": "/workshop/analytics",
    "targetPathname": "/dashboard"
  },
  {
    "sourcePathname": "/workshop/campaigns",
    "targetPathname": "/my-campaigns"
  },
  {
    "sourcePathname": "/workshop/payouts",
    "targetPathname": "/payouts"
  }
] as const;
const metadataCases = [
  {
    "pathname": "/",
    "surfaceKey": "home",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/explore",
    "surfaceKey": "explore",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/townhall",
    "surfaceKey": "townhall",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/townhall/watch",
    "surfaceKey": "townhall_watch",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/townhall/listen",
    "surfaceKey": "townhall_listen",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/townhall/read",
    "surfaceKey": "townhall_read",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/townhall/gallery",
    "surfaceKey": "townhall_gallery",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/townhall/live",
    "surfaceKey": "townhall_live",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/watch",
    "surfaceKey": "watch_hub",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/listen",
    "surfaceKey": "listen_hub",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/read",
    "surfaceKey": "read_hub",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/gallery",
    "surfaceKey": "gallery_hub",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/live",
    "surfaceKey": "live_hub",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/collect",
    "surfaceKey": "collect_entry",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/auctions",
    "surfaceKey": "auctions",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/auth/sign-in",
    "surfaceKey": "auth_sign_in",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/auth/sign-up",
    "surfaceKey": "auth_sign_up",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/auth/wallet-connect",
    "surfaceKey": "wallet_connect",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/auth/wallet-link",
    "surfaceKey": "wallet_link",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/onboarding/profile-setup",
    "surfaceKey": "profile_setup",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/logout",
    "surfaceKey": "logout",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/studio/handle-sample",
    "surfaceKey": "studio_public",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/worlds",
    "surfaceKey": "world_index",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/worlds/id-sample",
    "surfaceKey": "world_detail",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/worlds/id-sample/drops",
    "surfaceKey": "world_drops_table",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample",
    "surfaceKey": "drop_detail",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/details",
    "surfaceKey": "drop_details",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/properties",
    "surfaceKey": "drop_properties",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/offers",
    "surfaceKey": "drop_offers",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/activity",
    "surfaceKey": "drop_activity",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/preview",
    "surfaceKey": "drop_preview_generic",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/preview/gallery",
    "surfaceKey": "drop_preview_gallery",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/drops/id-sample/watch",
    "surfaceKey": "drop_full_watch",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/drops/id-sample/listen",
    "surfaceKey": "drop_full_listen",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/drops/id-sample/read",
    "surfaceKey": "drop_full_read",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/drops/id-sample/gallery",
    "surfaceKey": "drop_full_gallery",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/pay/buy/drop_id-sample",
    "surfaceKey": "pay_buy_drop",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/my-collection",
    "surfaceKey": "my_collection_owned",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/favorites",
    "surfaceKey": "favorites_saved",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/certificates/cert_id-sample",
    "surfaceKey": "certificate_verify",
    "publicSafe": "true",
    "hasSession": false,
    "sessionRoles": []
  },
  {
    "pathname": "/invest",
    "surfaceKey": "invest",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/create",
    "surfaceKey": "create",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "creator"
    ]
  },
  {
    "pathname": "/workshop",
    "surfaceKey": "workshop_root",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "creator"
    ]
  },
  {
    "pathname": "/dashboard",
    "surfaceKey": "dashboard_analytics",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "creator"
    ]
  },
  {
    "pathname": "/my-campaigns",
    "surfaceKey": "my_campaigns",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "creator"
    ]
  },
  {
    "pathname": "/payouts",
    "surfaceKey": "payouts",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "creator"
    ]
  },
  {
    "pathname": "/settings/account",
    "surfaceKey": "settings_account",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/settings/security",
    "surfaceKey": "settings_security",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/settings/apps",
    "surfaceKey": "settings_apps",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/settings/notifications",
    "surfaceKey": "settings_notifications",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  },
  {
    "pathname": "/following",
    "surfaceKey": "following",
    "publicSafe": "false",
    "hasSession": true,
    "sessionRoles": [
      "collector"
    ]
  }
] as const;
const sessionCases = [
  {
    "pathname": "/collect"
  },
  {
    "pathname": "/auth/wallet-link"
  },
  {
    "pathname": "/onboarding/profile-setup"
  },
  {
    "pathname": "/logout"
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
    "pathname": "/drops/id-sample/gallery"
  },
  {
    "pathname": "/pay/buy/drop_id-sample"
  },
  {
    "pathname": "/my-collection"
  },
  {
    "pathname": "/favorites"
  },
  {
    "pathname": "/invest"
  },
  {
    "pathname": "/create"
  },
  {
    "pathname": "/workshop"
  },
  {
    "pathname": "/dashboard"
  },
  {
    "pathname": "/my-campaigns"
  },
  {
    "pathname": "/payouts"
  },
  {
    "pathname": "/settings/account"
  },
  {
    "pathname": "/settings/security"
  },
  {
    "pathname": "/settings/apps"
  },
  {
    "pathname": "/settings/notifications"
  },
  {
    "pathname": "/following"
  }
] as const;
const roleRequiredCases = [
  {
    "pathname": "/collect",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/auth/wallet-link",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/onboarding/profile-setup",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/logout",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/drops/id-sample/watch",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/drops/id-sample/listen",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/drops/id-sample/read",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/drops/id-sample/gallery",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/pay/buy/drop_id-sample",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/my-collection",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/favorites",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/invest",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/create",
    "allowedRoles": [
      "creator"
    ],
    "disallowedRole": "collector"
  },
  {
    "pathname": "/workshop",
    "allowedRoles": [
      "creator"
    ],
    "disallowedRole": "collector"
  },
  {
    "pathname": "/dashboard",
    "allowedRoles": [
      "creator"
    ],
    "disallowedRole": "collector"
  },
  {
    "pathname": "/my-campaigns",
    "allowedRoles": [
      "creator"
    ],
    "disallowedRole": "collector"
  },
  {
    "pathname": "/payouts",
    "allowedRoles": [
      "creator"
    ],
    "disallowedRole": "collector"
  },
  {
    "pathname": "/settings/account",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/settings/security",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/settings/apps",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/settings/notifications",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  },
  {
    "pathname": "/following",
    "allowedRoles": [
      "collector",
      "creator"
    ],
    "disallowedRole": null
  }
] as const;
const proofSessionCases = [
  {
    "pathname": "/collect"
  },
  {
    "pathname": "/auth/wallet-link"
  },
  {
    "pathname": "/onboarding/profile-setup"
  },
  {
    "pathname": "/logout"
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
    "pathname": "/drops/id-sample/gallery"
  },
  {
    "pathname": "/pay/buy/drop_id-sample"
  },
  {
    "pathname": "/my-collection"
  },
  {
    "pathname": "/favorites"
  },
  {
    "pathname": "/invest"
  },
  {
    "pathname": "/create"
  },
  {
    "pathname": "/workshop"
  },
  {
    "pathname": "/dashboard"
  },
  {
    "pathname": "/my-campaigns"
  },
  {
    "pathname": "/payouts"
  },
  {
    "pathname": "/settings/account"
  },
  {
    "pathname": "/settings/security"
  },
  {
    "pathname": "/settings/apps"
  },
  {
    "pathname": "/settings/notifications"
  },
  {
    "pathname": "/following"
  }
] as const;
const proofPublicSafeCases = [
  {
    "pathname": "/"
  },
  {
    "pathname": "/drops/id-sample"
  },
  {
    "pathname": "/drops/id-sample/details"
  },
  {
    "pathname": "/drops/id-sample/properties"
  },
  {
    "pathname": "/drops/id-sample/preview"
  },
  {
    "pathname": "/drops/id-sample/preview/gallery"
  },
  {
    "pathname": "/certificates/cert_id-sample"
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
      hasSession: testCase.hasSession,
      sessionRoles: testCase.sessionRoles
    });

    assert.equal(decision.kind, "next");
    if (decision.kind === "next") {
      assert.equal(decision.headers["x-ook-surface-key"], testCase.surfaceKey);
      assert.equal(decision.headers["x-ook-public-safe"], testCase.publicSafe);
    }
  }
});

test("generated role-gated surfaces allow configured roles", () => {
  for (const testCase of roleRequiredCases) {
    const decision = evaluateRoutePolicy({
      pathname: testCase.pathname,
      search: "",
      hasSession: true,
      sessionRoles: testCase.allowedRoles
    });

    assert.equal(decision.kind, "next");
  }
});

test("generated role-gated surfaces redirect disallowed roles", () => {
  for (const testCase of roleRequiredCases) {
    if (!testCase.disallowedRole) {
      continue;
    }

    const decision = evaluateRoutePolicy({
      pathname: testCase.pathname,
      search: "",
      hasSession: true,
      sessionRoles: [testCase.disallowedRole]
    });

    assert.equal(decision.kind, "redirect");
    if (decision.kind === "redirect") {
      assert.equal(decision.status, 307);
      assert.equal(decision.pathname, "/auth/sign-in");
      assert.equal(decision.searchParams.returnTo, testCase.pathname);
      assert.equal(decision.searchParams.error, "role_required");
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

test("generated proof-id session-gated surfaces redirect when session is missing", () => {
  for (const testCase of proofSessionCases) {
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

test("generated proof-id public-safe surfaces stay public", () => {
  for (const testCase of proofPublicSafeCases) {
    const decision = evaluateRoutePolicy({
      pathname: testCase.pathname,
      search: "",
      hasSession: false
    });

    assert.equal(decision.kind, "next");
    if (decision.kind === "next") {
      assert.equal(decision.headers["x-ook-public-safe"], "true");
    }
  }
});
