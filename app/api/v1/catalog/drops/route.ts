import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { ok } from "@/lib/bff/http";

export async function GET() {
  const drops = await commerceGateway.listDrops();
  return ok({ drops });
}
