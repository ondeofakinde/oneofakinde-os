import { RouteStub } from "@/components/route-stub";

export default function AuctionsPage() {
  return (
    <RouteStub
      title="auctions"
      route="/auctions"
      roles={["public", "collector", "creator"]}
      publicSafe
      summary="auction index architecture route is ready for auction contracts."
    />
  );
}
