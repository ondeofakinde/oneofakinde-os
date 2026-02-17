import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type {
  Certificate,
  MyCollectionSnapshot,
  PurchaseReceipt,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type MyCollectionScreenProps = {
  session: Session;
  collection: MyCollectionSnapshot;
  status: string | null;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

export function MyCollectionScreen({
  session,
  collection,
  status,
  receipt,
  certificate
}: MyCollectionScreenProps) {
  return (
    <AppShell
      title="my collection"
      subtitle="owned drops with certificate links and recent receipt status"
      session={session}
      activeNav="my_collection"
    >
      {status ? (
        <section className="slice-banner" aria-live="polite">
          {status === "completed" ? "purchase completed" : "drop already in my collection"}
          {receipt ? ` · receipt ${receipt.id}` : ""}
          {certificate ? (
            <>
              {" "}
              · <Link href={routes.certificate(certificate.id)}>open certificate</Link>
            </>
          ) : null}
        </section>
      ) : null}

      {receipt ? (
        <section className="slice-panel">
          <p className="slice-label">receipt detail</p>
          <dl className="slice-list">
            <div>
              <dt>receipt id</dt>
              <dd>{receipt.id}</dd>
            </div>
            <div>
              <dt>status</dt>
              <dd>{receipt.status}</dd>
            </div>
            <div>
              <dt>amount</dt>
              <dd>{formatUsd(receipt.amountUsd)}</dd>
            </div>
            <div>
              <dt>purchased</dt>
              <dd>{receipt.purchasedAt}</dd>
            </div>
          </dl>

          {certificate ? (
            <div className="slice-button-row">
              <Link href={routes.certificate(certificate.id)} className="slice-button alt">
                open certificate
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{collection.ownedDrops.length} collected drops</p>
          <p className="slice-total">total spent {formatUsd(collection.totalSpentUsd)}</p>
        </div>

        {collection.ownedDrops.length === 0 ? (
          <p className="slice-copy">your my collection is empty. explore and buy a drop to begin.</p>
        ) : (
          <ul className="slice-grid" aria-label="my collection drop list">
            {collection.ownedDrops.map((owned) => (
              <li key={owned.certificateId} className="slice-drop-card">
                <p className="slice-label">{owned.drop.worldLabel}</p>
                <h2 className="slice-title">{owned.drop.title}</h2>
                <p className="slice-copy">{owned.drop.synopsis}</p>
                <p className="slice-meta">certificate: {owned.certificateId}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(owned.drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.dropWatch(owned.drop.id)} className="slice-button alt">
                    watch
                  </Link>
                  <Link href={routes.certificate(owned.certificateId)} className="slice-button alt">
                    certificate
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
