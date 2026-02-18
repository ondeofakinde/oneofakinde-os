import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import Link from "next/link";

const walletChoices = ["phantom", "walletconnect", "coinbase wallet", "metamask"];

export default async function WalletLinkPage() {
  const session = await requireSession("/auth/wallet-link");

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="link wallet">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">link wallet</h1>
          <p className="identity-copy">session owner: @{session.handle}</p>
        </header>

        <section className="wallet-grid" aria-label="wallet providers">
          {walletChoices.map((walletName) => (
            <button key={walletName} type="button" className="identity-chip wallet-choice" disabled>
              {walletName}
            </button>
          ))}
        </section>

        <section className="wallet-qr-card" aria-label="wallet qr pairing">
          <div className="wallet-qr" />
          <div>
            <p className="wallet-qr-label">device pairing</p>
            <p className="wallet-qr-copy">scan or paste code in your wallet app to complete wallet-link.</p>
            <code className="wallet-qr-code">ook://wallet-link/@{session.handle}</code>
          </div>
        </section>

        <div className="identity-foot">
          <Link href={routes.profileSetup()} className="identity-link">
            continue onboarding
          </Link>
        </div>
      </section>
    </main>
  );
}
