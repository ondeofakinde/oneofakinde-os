import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { ok } from "@/lib/bff/http";

export async function GET() {
  const worlds = await commerceGateway.listWorlds();
  return ok({ worlds });
}
