import { normalizeReturnTo } from "@/lib/session";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { signUpAction } from "./actions";

type SignUpPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
    error?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedParams = await searchParams;
  const returnTo = normalizeReturnTo(firstParam(resolvedParams.returnTo), "/onboarding/profile-setup");
  const errorCode = firstParam(resolvedParams.error);
  const hasInvalidEmail = errorCode === "invalid_email";

  return (
    <main className="slice-shell">
      <section className="slice-panel auth-panel">
        <p className="slice-kicker">oneofakinde</p>
        <h1 className="slice-h1">sign up</h1>
        <p className="slice-copy">create your account and continue into profile setup.</p>

        <form action={signUpAction} className="slice-form">
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="slice-field">
            email
            <input
              className="slice-input"
              type="email"
              name="email"
              placeholder="new-account@oneofakinde.com"
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

          <button type="submit" className="slice-button">
            create account
          </button>
        </form>

        <p className="slice-meta">
          already have an account?{" "}
          <Link href={routes.signIn(returnTo)} className="slice-link">
            sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
