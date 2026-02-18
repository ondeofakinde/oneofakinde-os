import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { ok } from "@/lib/bff/http";

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  await commerceBffService.clearSession(guard.session.sessionToken);
  return ok({ cleared: true });
}
