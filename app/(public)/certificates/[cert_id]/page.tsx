import { AppShell } from "@/features/shell/app-shell";
import { commerceGateway } from "@/lib/adapters/mock-commerce";
import { routes } from "@/lib/routes";
import { getOptionalSession } from "@/lib/server/session";
import Link from "next/link";
import { notFound } from "next/navigation";

type CertificatePageProps = {
  params: Promise<{ cert_id: string }>;
};

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { cert_id: certificateId } = await params;

  const [session, certificate] = await Promise.all([
    getOptionalSession(),
    commerceGateway.getCertificateById(certificateId)
  ]);

  if (!certificate) {
    notFound();
  }

  const drop = await commerceGateway.getDropById(certificate.dropId);
  if (!drop) {
    notFound();
  }

  return (
    <AppShell
      title="certificate"
      subtitle="public certificate verification for a drop"
      session={session}
      activeNav="explore"
    >
      <section className="slice-panel">
        <p className="slice-label">verification status</p>
        <h2 className="slice-title">{certificate.status}</h2>
        <p className="slice-copy">
          this certificate confirms ownership history for the linked drop.
        </p>

        <dl className="slice-list">
          <div>
            <dt>certificate id</dt>
            <dd>{certificate.id}</dd>
          </div>
          <div>
            <dt>drop</dt>
            <dd>{certificate.dropTitle}</dd>
          </div>
          <div>
            <dt>owner</dt>
            <dd>@{certificate.ownerHandle}</dd>
          </div>
          <div>
            <dt>receipt</dt>
            <dd>{certificate.receiptId}</dd>
          </div>
          <div>
            <dt>issued</dt>
            <dd>{certificate.issuedAt}</dd>
          </div>
        </dl>

        <div className="slice-button-row">
          <Link href={routes.drop(drop.id)} className="slice-button ghost">
            open drop
          </Link>
          <Link href={routes.studio(drop.studioHandle)} className="slice-button alt">
            open studio
          </Link>
          <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
            watch
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
