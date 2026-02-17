import { commerceBffService } from "@/lib/bff/service";
import { ok } from "@/lib/bff/http";

export async function GET() {
  const drops = await commerceBffService.listDrops();
  return ok({ drops });
}
