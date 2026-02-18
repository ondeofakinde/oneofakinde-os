import { routes } from "@/lib/routes";
import Link from "next/link";

export default function WalletConnectPage() {
  return (
    <main className="slice-shell">
      <section className="slice-panel auth-panel">
        <p className="slice-kicker">oneofakinde</p>
        <h1 className="slice-h1">connect wallet</h1>
        <p className="slice-copy">connect a wallet now, or continue with account auth and link it later.</p>

        <div className="slice-button-row">
          <button type="button" className="slice-button" disabled>
            connect phantom
          </button>
          <button type="button" className="slice-button ghost" disabled>
            connect walletconnect
          </button>
        </div>

        <p className="slice-meta">wallet providers are scaffolded in architecture-first mode.</p>

        <div className="slice-button-row">
          <Link href={routes.signIn()} className="slice-button alt">
            sign in
          </Link>
          <Link href={routes.signUp()} className="slice-button alt">
            create account
          </Link>
        </div>
      </section>
    </main>
  );
}
