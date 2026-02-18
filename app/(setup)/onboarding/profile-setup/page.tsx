import { requireSession } from "@/lib/server/session";

export default async function ProfileSetupPage() {
  const session = await requireSession("/onboarding/profile-setup");

  return (
    <main className="slice-shell">
      <section className="slice-panel auth-panel">
        <p className="slice-kicker">oneofakinde</p>
        <h1 className="slice-h1">profile setup</h1>
        <p className="slice-copy">build your identity, @{session.handle}.</p>

        <form className="slice-form">
          <label className="slice-field">
            username
            <input className="slice-input" type="text" name="username" placeholder="choose a username" />
          </label>
          <label className="slice-field">
            display name
            <input className="slice-input" type="text" name="displayName" placeholder="choose your name" />
          </label>
          <label className="slice-field">
            bio
            <textarea className="slice-input" name="bio" placeholder="say something about you and your work" />
          </label>
          <button type="button" className="slice-button" disabled>
            save identity
          </button>
        </form>
      </section>
    </main>
  );
}
