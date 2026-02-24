import type { Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import { buildDefaultEntryFlow } from "@/lib/system-flow";
import Link from "next/link";

type EntryScreenProps = {
  session: Session | null;
};

export function EntryScreen({ session }: EntryScreenProps) {
  const flow = buildDefaultEntryFlow();
  const signInHref = flow.signInHref;
  const signUpHref = flow.signUpHref;
  const walletConnectHref = flow.walletConnectHref;

  return (
    <main className="entry-page">
      <section className="entry-phone-shell" aria-label="open app">
        <header className="entry-head">
          <p className="entry-kicker">welcome to</p>
          <h1 className="entry-logo">one of a kinde</h1>
          <p className="entry-tagline">be independent</p>
        </header>

        {session ? (
          <div className="entry-actions">
            <p className="entry-session">signed in as @{session.handle}</p>
            <Link href={routes.townhall()} className="entry-primary-cta">
              open townhall
            </Link>
            <Link href={routes.collect()} className="entry-secondary-cta">
              open collect
            </Link>
            <Link href={routes.myCollection()} className="entry-secondary-cta">
              open my collection
            </Link>
          </div>
        ) : (
          <div className="entry-actions">
            <Link href={signInHref} className="entry-primary-cta">
              sign in
            </Link>
            <Link href={signUpHref} className="entry-secondary-cta">
              create account
            </Link>
            <Link href={walletConnectHref} className="entry-secondary-cta">
              connect wallet
            </Link>
          </div>
        )}

        <section className="entry-flow" aria-label="system flow">
          <p>flow</p>
          <ol>
            <li>auth</li>
            <li>wallet</li>
            <li>profile setup</li>
            <li>townhall</li>
            <li>drop</li>
            <li>collect</li>
            <li>my collection</li>
            <li>certificate</li>
            <li>watch/listen/read/photos</li>
          </ol>
        </section>
      </section>
    </main>
  );
}
