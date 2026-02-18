import { requireSession } from "@/lib/server/session";

export default async function ProfileSetupPage() {
  const session = await requireSession("/onboarding/profile-setup");

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="profile setup">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">let&apos;s build your identity</h1>
          <p className="identity-copy">finalize your studio presence, @{session.handle}.</p>
        </header>

        <form className="identity-form">
          <label className="identity-field">
            <span className="identity-label">choose your profile pic</span>
            <div className="identity-upload-row">
              <button type="button" className="identity-chip" disabled>
                upload image
              </button>
              <span className="identity-upload-note">png, jpg, or webp</span>
            </div>
          </label>

          <label className="identity-field">
            <span className="identity-label">choose your username</span>
            <input className="identity-input" type="text" name="username" placeholder="@oneofakinde" />
          </label>

          <label className="identity-field">
            <span className="identity-label">choose your name</span>
            <input className="identity-input" type="text" name="displayName" placeholder="your display name" />
          </label>

          <label className="identity-field">
            <span className="identity-label">say something about you and your work</span>
            <textarea
              className="identity-input identity-textarea"
              name="bio"
              placeholder="identity statement for your studio"
            />
          </label>

          <button type="button" className="identity-cta" disabled>
            let&apos;s go
          </button>
        </form>
      </section>
    </main>
  );
}
