import { normalizeReturnTo } from "@/lib/session";
import { signInAction } from "./actions";

type SignInPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
    error?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedParams = await searchParams;
  const returnTo = normalizeReturnTo(firstParam(resolvedParams.returnTo));
  const errorCode = firstParam(resolvedParams.error);
  const hasInvalidEmail = errorCode === "invalid_email";
  const hasRoleError = errorCode === "role_required";

  return (
    <main className="slice-shell">
      <section className="slice-panel auth-panel">
        <p className="slice-kicker">oneofakinde</p>
        <h1 className="slice-h1">sign in</h1>
        <p className="slice-copy">start a session to continue to my collection and buy surfaces.</p>

        <form action={signInAction} className="slice-form">
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="slice-field">
            email
            <input
              className="slice-input"
              type="email"
              name="email"
              placeholder="collector@oneofakinde.com"
              defaultValue="collector@oneofakinde.com"
              required
            />
          </label>

          <label className="slice-field">
            role
            <select className="slice-select" name="role" defaultValue="collector">
              <option value="collector">collector</option>
              <option value="creator">creator</option>
            </select>
          </label>

          {hasInvalidEmail ? <p className="slice-error">enter a valid email to continue.</p> : null}
          {hasRoleError ? (
            <p className="slice-error">this surface requires a different role. choose creator to continue.</p>
          ) : null}

          <button type="submit" className="slice-button">
            continue
          </button>
        </form>
      </section>
    </main>
  );
}
