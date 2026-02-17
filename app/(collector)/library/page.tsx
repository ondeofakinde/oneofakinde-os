import { LibraryScreen } from "@/features/library/library-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

export default async function LibraryPage() {
  const session = await requireSession("/library");
  const library = await commerceGateway.getLibrary(session.accountId);

  if (!library) {
    notFound();
  }

  return <LibraryScreen session={session} library={library} />;
}
