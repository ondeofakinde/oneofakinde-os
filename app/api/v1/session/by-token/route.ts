import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";

type SessionTokenBody = {
  sessionToken?: string;
};

export async function POST(request: Request) {
  const payload = await safeJson<SessionTokenBody>(request);
  const sessionToken = getRequiredBodyString(payload as Record<string, unknown> | null, "sessionToken");
  if (!sessionToken) {
    return badRequest("sessionToken is required");
  }

  const session = await commerceGateway.getSessionByToken(sessionToken);
  if (!session) {
    return ok({ session: null });
  }

  return ok({ session });
}
