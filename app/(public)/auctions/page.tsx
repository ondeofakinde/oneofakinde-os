import { redirect } from "next/navigation";

export default function AuctionsPage() {
  redirect("/collect?lane=auction");
}
