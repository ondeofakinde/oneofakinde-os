import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import type { AccountRole } from "@/lib/domain/contracts";

type SessionCreateBody = {
  email?: string;
  role?: string;
};

function isAccountRole(value: string): value is AccountRole {
  return value === "collector" || value === "creator";
}

export async function POST(request: Request) {
  const payload = await safeJson<SessionCreateBody>(request);
  const email = getRequiredBodyString(payload as Record<string, unknown> | null, "email");
  const role = getRequiredBodyString(payload as Record<string, unknown> | null, "role");

  if (!email) {
    return badRequest("email is required");
  }
  if (!role || !isAccountRole(role)) {
    return badRequest("role must be collector or creator");
  }

  const session = await commerceGateway.createSession({
    email,
    role
  });

  return ok({ session }, 201);
}
