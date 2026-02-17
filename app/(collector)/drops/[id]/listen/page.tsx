import { DropConsumeScreen } from "@/features/drops/drop-consume-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropListenPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropListenPage({ params }: DropListenPageProps) {
  const { id } = await params;
  const session = await requireSession(`/drops/${id}/listen`);

  const drop = await gateway.getDropById(id);
  if (!drop) {
    notFound();
  }

  const hasEntitlement = await gateway.hasDropEntitlement(session.accountId, id);
  const collection = hasEntitlement
    ? await gateway.getMyCollection(session.accountId)
    : null;

  const ownedDrop = collection?.ownedDrops.find((entry) => entry.drop.id === id) ?? null;

  const [receipt, certificate] = await Promise.all([
    ownedDrop
      ? gateway.getReceipt(session.accountId, ownedDrop.receiptId)
      : Promise.resolve(null),
    ownedDrop
      ? gateway.getCertificateById(ownedDrop.certificateId)
      : Promise.resolve(null)
  ]);

  return (
    <DropConsumeScreen
      mode="listen"
      session={session}
      drop={drop}
      hasEntitlement={hasEntitlement}
      receipt={receipt}
      certificate={certificate}
    />
  );
}
