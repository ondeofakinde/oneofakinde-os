import { commerceBffService } from "@/lib/bff/service";
import { ok } from "@/lib/bff/http";

export async function GET() {
  const worlds = await commerceBffService.listWorlds();
  return ok({ worlds });
}
