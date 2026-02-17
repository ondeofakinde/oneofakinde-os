import { SliceFrame } from "@/components/slice-frame";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";
import { purchaseDropAction } from "./actions";

type BuyDropPageProps = {
  params: Promise<{ drop_id: string }>;
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

export default async function BuyDropPage({ params }: BuyDropPageProps) {
  const { drop_id: dropId } = await params;
  const session = await requireSession(`/pay/buy/${dropId}`);
  const checkout = await commerceGateway.getCheckoutPreview(session.accountId, dropId);

  if (!checkout) {
    notFound();
  }

  const isAlreadyOwned = checkout.totalUsd === 0;

  return (
    <SliceFrame
      title="buy"
      subtitle="checkout handoff with purchase, receipt, and refund context"
      session={session}
    >
      <article className="slice-panel">
        <h2 className="slice-title">{checkout.drop.title}</h2>

        <dl className="slice-list">
          <div>
            <dt>subtotal</dt>
            <dd>{formatUsd(checkout.subtotalUsd)}</dd>
          </div>
          <div>
            <dt>processing</dt>
            <dd>{formatUsd(checkout.processingUsd)}</dd>
          </div>
          <div>
            <dt>total</dt>
            <dd>{formatUsd(checkout.totalUsd)}</dd>
          </div>
        </dl>

        <p className="slice-copy">
          {isAlreadyOwned
            ? "this drop is already in your my collection. continue to view receipt history."
            : "confirm purchase to create a receipt. refund policy and follow-up support are listed after checkout."}
        </p>

        <form action={purchaseDropAction} className="slice-form">
          <input type="hidden" name="drop_id" value={checkout.drop.id} />
          <button type="submit" className="slice-button">
            {isAlreadyOwned ? "open my collection" : "confirm purchase"}
          </button>
        </form>
      </article>
    </SliceFrame>
  );
}
