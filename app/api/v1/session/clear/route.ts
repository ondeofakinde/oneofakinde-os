import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";

type SessionClearBody = {
  sessionToken?: string;
};

export async function POST(request: Request) {
  const payload = await safeJson<SessionClearBody>(request);
  const sessionToken = getRequiredBodyString(payload as Record<string, unknown> | null, "sessionToken");
  if (!sessionToken) {
    return badRequest("sessionToken is required");
  }

  await commerceBffService.clearSession(sessionToken);
  return ok({ cleared: true });
}
