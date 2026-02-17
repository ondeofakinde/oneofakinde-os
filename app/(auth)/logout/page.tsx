import { logoutAction } from "./actions";

export default function LogoutPage() {
  return (
    <main className="slice-shell">
      <section className="slice-panel auth-panel">
        <p className="slice-kicker">oneofakinde</p>
        <h1 className="slice-h1">log out</h1>
        <p className="slice-copy">close this session and return to sign in.</p>

        <form action={logoutAction} className="slice-form">
          <button type="submit" className="slice-button">
            confirm log out
          </button>
        </form>
      </section>
    </main>
  );
}
