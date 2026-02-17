import { evaluateRoutePolicy } from "@/lib/route-policy";
import { SESSION_COOKIE } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const decision = evaluateRoutePolicy({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession: Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  });

  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;

    if (Object.keys(decision.searchParams).length > 0) {
      url.search = "";
      for (const [key, value] of Object.entries(decision.searchParams)) {
        url.searchParams.set(key, value);
      }
    }

    return NextResponse.redirect(url, decision.status);
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(decision.headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"]
};
