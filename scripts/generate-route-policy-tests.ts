import fs from "node:fs";
import path from "node:path";

type SurfaceRole = "public" | "collector" | "creator";

type SurfaceMap = {
  surfaces: Array<{
    route: string;
    surface_key: string;
    public_safe: boolean;
    proof_ids: string[];
    roles: SurfaceRole[];
  }>;
  legacy_redirects: Record<string, string>;
};

const sourceArg = process.argv[2] || "config/surface-map.generated.json";
const outputArg = process.argv[3] || "tests/proofs/route-policy.generated.test.ts";

const sourcePath = path.resolve(process.cwd(), sourceArg);
const outputPath = path.resolve(process.cwd(), outputArg);

if (!fs.existsSync(sourcePath)) {
  console.error(`missing surface map json: ${sourcePath}`);
  process.exit(1);
}

const surfaceMap = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as SurfaceMap;

function routeParamNames(routePattern: string): string[] {
  return [...routePattern.matchAll(/:([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
}

function dedupeByPathname<T extends { pathname: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const entry of entries) {
    if (seen.has(entry.pathname)) {
      continue;
    }
    seen.add(entry.pathname);
    result.push(entry);
  }

  return result;
}

function instantiateRoute(routePattern: string): string {
  return routePattern.replace(/:([a-zA-Z0-9_]+)/g, (_full, name: string) => `${name}-sample`);
}

function mapLegacyToCanonicalPath(legacyPattern: string, canonicalPattern: string): {
  sourcePathname: string;
  targetPathname: string;
} {
  const legacyParamNames = routeParamNames(legacyPattern);
  const canonicalParamNames = routeParamNames(canonicalPattern);

  const legacyValuesByName = Object.fromEntries(
    legacyParamNames.map((name) => [name, `${name}-sample`])
  );

  const sourcePathname = legacyPattern.replace(
    /:([a-zA-Z0-9_]+)/g,
    (_full, name: string) => legacyValuesByName[name] ?? `${name}-sample`
  );

  const targetPathname = canonicalPattern.replace(/:([a-zA-Z0-9_]+)/g, (_full, name: string) => {
    if (legacyValuesByName[name]) {
      return legacyValuesByName[name];
    }

    const indexInCanonical = canonicalParamNames.indexOf(name);
    const positionalFallback = legacyParamNames[indexInCanonical];
    if (positionalFallback && legacyValuesByName[positionalFallback]) {
      return legacyValuesByName[positionalFallback];
    }

    return `${name}-sample`;
  });

  return { sourcePathname, targetPathname };
}

function getRoleRequirements(surface: SurfaceMap["surfaces"][number]): Array<"collector" | "creator"> {
  if (!Array.isArray(surface.roles) || surface.roles.includes("public")) {
    return [];
  }

  return surface.roles.filter((role): role is "collector" | "creator" => role === "collector" || role === "creator");
}

function pickDisallowedRole(
  allowedRoles: Array<"collector" | "creator">
): "collector" | "creator" | null {
  const roleCandidates: Array<"collector" | "creator"> = ["collector", "creator"];
  return roleCandidates.find((role) => !allowedRoles.includes(role)) ?? null;
}

const proofIdsExpectSessionGate = new Set([
  "p_session_required",
  "p_media_gate_entitlement",
  "p_stripe_checkout_redirect",
  "p_first_run_destination"
]);

const proofIdsExpectPublicSafe = new Set([
  "p_public_safe_render",
  "p_preview_safe_only",
  "p_public_cert_verify"
]);

const metadataCases = surfaceMap.surfaces.map((surface) => ({
  pathname: instantiateRoute(surface.route),
  surfaceKey: surface.surface_key,
  publicSafe: String(surface.public_safe),
  hasSession: getRoleRequirements(surface).length > 0,
  sessionRoles: getRoleRequirements(surface).slice(0, 1)
}));

const sessionCases = surfaceMap.surfaces
  .filter((surface) => surface.proof_ids.includes("p_session_required"))
  .map((surface) => ({
    pathname: instantiateRoute(surface.route)
  }));

const roleRequiredCases = surfaceMap.surfaces
  .map((surface) => {
    const roleRequirements = getRoleRequirements(surface);
    if (roleRequirements.length === 0) {
      return null;
    }

    return {
      pathname: instantiateRoute(surface.route),
      allowedRoles: roleRequirements,
      disallowedRole: pickDisallowedRole(roleRequirements)
    };
  })
  .filter(
    (
      entry
    ): entry is {
      pathname: string;
      allowedRoles: Array<"collector" | "creator">;
      disallowedRole: "collector" | "creator" | null;
    } => entry !== null
  );

const proofSessionCases = dedupeByPathname(
  surfaceMap.surfaces
    .filter((surface) => surface.proof_ids.some((proofId) => proofIdsExpectSessionGate.has(proofId)))
    .map((surface) => ({
      pathname: instantiateRoute(surface.route)
    }))
);

const proofPublicSafeCases = dedupeByPathname(
  surfaceMap.surfaces
    .filter((surface) => surface.proof_ids.some((proofId) => proofIdsExpectPublicSafe.has(proofId)))
    .map((surface) => ({
      pathname: instantiateRoute(surface.route)
    }))
);

const allLegacyCases = Object.entries(surfaceMap.legacy_redirects).map(
  ([legacyPattern, canonicalPattern]) => {
    const mapped = mapLegacyToCanonicalPath(legacyPattern, canonicalPattern);
    return {
      sourcePathname: mapped.sourcePathname,
      targetPathname: mapped.targetPathname
    };
  }
);

const redirectCases = allLegacyCases.filter(
  (entry) => entry.sourcePathname !== entry.targetPathname
);

const generated = `import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRoutePolicy } from "../../lib/route-policy";

const redirectCases = ${JSON.stringify(redirectCases, null, 2)} as const;
const metadataCases = ${JSON.stringify(metadataCases, null, 2)} as const;
const sessionCases = ${JSON.stringify(sessionCases, null, 2)} as const;
const roleRequiredCases = ${JSON.stringify(roleRequiredCases, null, 2)} as const;
const proofSessionCases = ${JSON.stringify(proofSessionCases, null, 2)} as const;
const proofPublicSafeCases = ${JSON.stringify(proofPublicSafeCases, null, 2)} as const;

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
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generated, "utf8");

console.log(`generated ${outputPath}`);
console.log(`legacy redirect cases: ${redirectCases.length}`);
console.log(`metadata cases: ${metadataCases.length}`);
console.log(`session cases: ${sessionCases.length}`);
console.log(`role cases: ${roleRequiredCases.length}`);
console.log(`proof session cases: ${proofSessionCases.length}`);
console.log(`proof public-safe cases: ${proofPublicSafeCases.length}`);
