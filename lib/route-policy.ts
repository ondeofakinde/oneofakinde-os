import { getLegacyRedirect, getRouteMeta, isSessionRequiredRoute } from "./surface-map";

export type RoutePolicyInput = {
  pathname: string;
  search: string;
  hasSession: boolean;
};

export type RoutePolicyDecision =
  | {
      kind: "redirect";
      status: 307 | 308;
      pathname: string;
      searchParams: Record<string, string>;
    }
  | {
      kind: "next";
      headers: Record<string, string>;
    };

export function evaluateRoutePolicy({ pathname, search, hasSession }: RoutePolicyInput): RoutePolicyDecision {
  const legacyRedirect = getLegacyRedirect(pathname);

  if (legacyRedirect) {
    return {
      kind: "redirect",
      status: 308,
      pathname: legacyRedirect,
      searchParams: {}
    };
  }

  if (isSessionRequiredRoute(pathname) && !hasSession) {
    return {
      kind: "redirect",
      status: 307,
      pathname: "/auth/sign-in",
      searchParams: {
        returnTo: `${pathname}${search}`
      }
    };
  }

  const meta = getRouteMeta(pathname);

  if (!meta) {
    return {
      kind: "next",
      headers: {}
    };
  }

  return {
    kind: "next",
    headers: {
      "x-ook-surface-key": meta.surface_key,
      "x-ook-public-safe": String(meta.public_safe)
    }
  };
}
