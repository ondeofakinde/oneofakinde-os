import { EntryScreen } from "@/features/entry/entry-screen";
import { getOptionalSession } from "@/lib/server/session";

export default async function IndexPage() {
  const session = await getOptionalSession();
  return <EntryScreen session={session} />;
}
