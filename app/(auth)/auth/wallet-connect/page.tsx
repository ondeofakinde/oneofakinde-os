import { routes } from "@/lib/routes";
import Link from "next/link";

const walletChoices = ["phantom", "walletconnect", "coinbase wallet", "metamask"];

export default function WalletConnectPage() {
  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="connect wallet">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">connect wallet</h1>
          <p className="identity-copy">choose a wallet now or scan to link on another device.</p>
        </header>

        <section className="wallet-grid" aria-label="wallet providers">
          {walletChoices.map((walletName) => (
            <button key={walletName} type="button" className="identity-chip wallet-choice" disabled>
              {walletName}
            </button>
          ))}
        </section>

        <section className="wallet-qr-card" aria-label="wallet qr link">
          <div className="wallet-qr" />
          <div>
            <p className="wallet-qr-label">qr link</p>
            <p className="wallet-qr-copy">scan with your mobile wallet app to link this account.</p>
            <code className="wallet-qr-code">ook://wallet-link/session</code>
          </div>
        </section>

        <footer className="identity-foot">
          <Link href={routes.signIn()} className="identity-link">
            continue with email
          </Link>
          <span>·</span>
          <Link href={routes.signUp()} className="identity-link">
            create account
          </Link>
        </footer>
      </section>
    </main>
  );
}
