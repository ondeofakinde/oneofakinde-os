import { getLegacyRedirect, getRouteMeta, isSessionRequiredRoute } from "./surface-map";
import type { AccountRole } from "./domain/contracts";

export type RoutePolicyInput = {
  pathname: string;
  search: string;
  hasSession: boolean;
  sessionRoles?: readonly AccountRole[];
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

function toSignInRedirect(pathname: string, search: string): RoutePolicyDecision {
  return {
    kind: "redirect",
    status: 307,
    pathname: "/auth/sign-in",
    searchParams: {
      returnTo: `${pathname}${search}`
    }
  };
}

function getNonPublicRoles(pathname: string): AccountRole[] {
  const meta = getRouteMeta(pathname);
  if (!meta || !Array.isArray(meta.roles)) {
    return [];
  }

  if (meta.roles.includes("public")) {
    return [];
  }

  return meta.roles.filter((role): role is AccountRole => role === "collector" || role === "creator");
}

export function evaluateRoutePolicy({
  pathname,
  search,
  hasSession,
  sessionRoles = []
}: RoutePolicyInput): RoutePolicyDecision {
  const legacyRedirect = getLegacyRedirect(pathname);

  if (legacyRedirect) {
    return {
      kind: "redirect",
      status: 308,
      pathname: legacyRedirect,
      searchParams: {}
    };
  }

  const roleRequirements = getNonPublicRoles(pathname);
  const sessionRoleSet = new Set(sessionRoles.filter((role) => role === "collector" || role === "creator"));

  if ((isSessionRequiredRoute(pathname) || roleRequirements.length > 0) && !hasSession) {
    return toSignInRedirect(pathname, search);
  }

  if (roleRequirements.length > 0) {
    const allowed = roleRequirements.some((requiredRole) => sessionRoleSet.has(requiredRole));
    if (!allowed) {
      return {
        kind: "redirect",
        status: 307,
        pathname: "/auth/sign-in",
        searchParams: {
          returnTo: `${pathname}${search}`,
          error: "role_required"
        }
      };
    }
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
