import { MyCollectionScreen } from "@/features/collection/my-collection-screen";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type MyCollectionPageProps = {
  searchParams: Promise<{
    receipt?: string | string[];
    status?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

// my collection
export default async function MyCollectionPage({ searchParams }: MyCollectionPageProps) {
  const session = await requireSession("/my-collection");
  const collection = await commerceGateway.getMyCollection(session.accountId);

  if (!collection) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const receiptId = firstParam(resolvedSearchParams.receipt);
  const status = firstParam(resolvedSearchParams.status);

  const [receipt, certificate] = await Promise.all([
    receiptId ? commerceGateway.getReceipt(session.accountId, receiptId) : Promise.resolve(null),
    receiptId ? commerceGateway.getCertificateByReceipt(session.accountId, receiptId) : Promise.resolve(null)
  ]);

  return (
    <MyCollectionScreen
      session={session}
      collection={collection}
      status={status}
      receipt={receipt}
      certificate={certificate}
    />
  );
}
