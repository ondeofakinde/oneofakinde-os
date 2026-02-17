import surfaceMap from "../config/surface-map.generated.json";

type Surface = (typeof surfaceMap)["surfaces"][number];

type CompiledPattern = {
  regex: RegExp;
  paramNames: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePathPattern(pattern: string): CompiledPattern {
  const paramNames: string[] = [];

  const regexSource = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }

      return escapeRegExp(segment);
    })
    .join("/");

  return {
    regex: new RegExp(`^${regexSource}$`),
    paramNames
  };
}

function matchPathPattern(pathname: string, compiled: CompiledPattern): {
  captures: string[];
  byName: Record<string, string>;
} | null {
  const match = compiled.regex.exec(pathname);
  if (!match) return null;

  const captures = match.slice(1);
  const byName = Object.fromEntries(
    compiled.paramNames.map((name, index) => [name, captures[index] ?? ""])
  );

  return { captures, byName };
}

function hydratePattern(
  pattern: string,
  paramsByName: Record<string, string>,
  captures: string[]
): string {
  let dynamicIndex = 0;

  return pattern
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) {
        return segment;
      }

      const key = segment.slice(1);
      const value = paramsByName[key] ?? captures[dynamicIndex] ?? "";
      dynamicIndex += 1;
      return value;
    })
    .join("/");
}

const compiledSurfaces = surfaceMap.surfaces.map((surface) => ({
  surface,
  compiled: compilePathPattern(surface.route)
}));

const compiledLegacyRedirects = Object.entries(surfaceMap.legacy_redirects ?? {}).map(
  ([legacyPattern, canonicalPattern]) => ({
    legacyPattern,
    canonicalPattern,
    compiledLegacy: compilePathPattern(legacyPattern)
  })
);

export function getLegacyRedirect(pathname: string): string | null {
  for (const redirectRule of compiledLegacyRedirects) {
    const match = matchPathPattern(pathname, redirectRule.compiledLegacy);
    if (!match) {
      continue;
    }

    const hydrated = hydratePattern(redirectRule.canonicalPattern, match.byName, match.captures);
    if (hydrated === pathname) {
      continue;
    }

    return hydrated;
  }

  return null;
}

export function getRouteMeta(pathname: string): Surface | null {
  const matched = compiledSurfaces.find(({ compiled }) => compiled.regex.test(pathname));
  return matched?.surface ?? null;
}

export function isSessionRequiredRoute(pathname: string): boolean {
  const meta = getRouteMeta(pathname);
  return Boolean(meta?.proof_ids?.includes("p_session_required"));
}

export function isPublicSafeRoute(pathname: string): boolean {
  const meta = getRouteMeta(pathname);
  return Boolean(meta?.public_safe);
}

export { surfaceMap };
