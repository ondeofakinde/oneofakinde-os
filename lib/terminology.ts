export type LintRule = {
  kind: "ban_terms" | "require_terms" | "context_allow" | string;
  terms?: string[];
};

export type SurfaceDefinition = {
  route: string;
  rules?: LintRule[];
};

export type SurfaceMapLike = {
  linter_matching?: {
    include_variants?: Array<{ base: string; variants?: string[] }>;
    include_ui_phrases?: string[];
  };
  exceptions?: {
    by_route?: Record<string, { allow_terms?: string[] }>;
  };
  surfaces: SurfaceDefinition[];
};

export type RouteDocument = {
  filePath: string;
  route: string;
  content: string;
};

export type TerminologyViolation = {
  filePath: string;
  route: string;
  type: "global-ban" | "route-ban" | "route-require";
  term: string;
  message: string;
};

const GLOBAL_VARIANT_BASES = new Set(["asset", "gallery", "profile"]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return false;

  if (/[^\w\s-]/.test(normalizedTerm)) {
    return text.toLowerCase().includes(normalizedTerm);
  }

  const parts = normalizedTerm.split(/\s+/).map(escapeRegExp);
  const pattern = `\\b${parts.join("\\s+")}\\b`;
  return new RegExp(pattern, "i").test(text);
}

export function routeFromAppPage(filePath: string, appRoot: string): string | null {
  const relative = filePath
    .replace(appRoot.endsWith("/") ? appRoot : `${appRoot}/`, "")
    .replace(/\\/g, "/");

  const segments = relative.split("/");
  if (segments.at(-1) !== "page.tsx") return null;

  const routeSegments = segments
    .slice(0, -1)
    .filter((segment) => !/^\(.+\)$/.test(segment))
    .map((segment) => {
      const dynamic = segment.match(/^\[(.+)\]$/);
      if (!dynamic) return segment;
      return `:${dynamic[1]}`;
    });

  return routeSegments.length > 0 ? `/${routeSegments.join("/")}` : "/";
}

export function collectTerminologyViolations(
  surfaceMap: SurfaceMapLike,
  routeDocuments: RouteDocument[]
): TerminologyViolation[] {
  const violations: TerminologyViolation[] = [];

  const routeToSurface = new Map(
    surfaceMap.surfaces.map((surface) => [surface.route, surface])
  );

  const globalVariants = (surfaceMap.linter_matching?.include_variants ?? [])
    .filter((item) => GLOBAL_VARIANT_BASES.has(item.base))
    .flatMap((item) => item.variants ?? []);

  const globalPhrases = surfaceMap.linter_matching?.include_ui_phrases ?? [];
  const globalTerms = [...new Set([...globalVariants, ...globalPhrases])];

  for (const routeDocument of routeDocuments) {
    const surface = routeToSurface.get(routeDocument.route);
    if (!surface) continue;

    const allowTerms =
      surfaceMap.exceptions?.by_route?.[routeDocument.route]?.allow_terms ?? [];

    for (const term of globalTerms) {
      if (allowTerms.includes(term)) continue;
      if (!containsTerm(routeDocument.content, term)) continue;

      violations.push({
        filePath: routeDocument.filePath,
        route: routeDocument.route,
        type: "global-ban",
        term,
        message: `found globally banned term '${term}'`
      });
    }

    for (const rule of surface.rules ?? []) {
      if (rule.kind === "ban_terms") {
        for (const term of rule.terms ?? []) {
          if (allowTerms.includes(term)) continue;
          if (!containsTerm(routeDocument.content, term)) continue;

          violations.push({
            filePath: routeDocument.filePath,
            route: routeDocument.route,
            type: "route-ban",
            term,
            message: `found route-banned term '${term}'`
          });
        }
      }

      if (rule.kind === "require_terms") {
        const hasRequiredTerm = (rule.terms ?? []).some((term) =>
          containsTerm(routeDocument.content, term)
        );

        if (!hasRequiredTerm) {
          violations.push({
            filePath: routeDocument.filePath,
            route: routeDocument.route,
            type: "route-require",
            term: (rule.terms ?? []).join(", "),
            message: `missing required term(s): ${(rule.terms ?? []).join(", ")}`
          });
        }
      }
    }
  }

  return violations;
}
