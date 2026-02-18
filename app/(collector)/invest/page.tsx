import { RouteStub } from "@/components/route-stub";
import { requireSession } from "@/lib/server/session";

export default async function InvestPage() {
  await requireSession("/invest");

  return (
    <RouteStub
      title="invest"
      route="/invest"
      roles={["collector", "creator"]}
      publicSafe={false}
      summary="invest architecture route is wired for contract-backed investment flows."
    />
  );
}
