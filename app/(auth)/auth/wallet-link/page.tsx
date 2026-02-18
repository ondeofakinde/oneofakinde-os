import { requireSession } from "@/lib/server/session";

export default async function WalletLinkPage() {
  const session = await requireSession("/auth/wallet-link");

  return (
    <main className="slice-shell">
      <section className="slice-panel auth-panel">
        <p className="slice-kicker">oneofakinde</p>
        <h1 className="slice-h1">link wallet</h1>
        <p className="slice-copy">session owner: @{session.handle}</p>
        <p className="slice-copy">wallet-link architecture route is ready for qr and provider linking flows.</p>
      </section>
    </main>
  );
}
