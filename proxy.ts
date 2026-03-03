import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "invite_access";
const INVITE_QUERY_PARAM = "invite";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const isSecureRequest = nextUrl.protocol === "https:";

  if (isPublicPath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  const configuredInviteKey = process.env.INVITE_KEY;
  if (!configuredInviteKey) {
    return NextResponse.next();
  }

  const hasAccessCookie = cookies.get(ACCESS_COOKIE)?.value === "1";
  if (hasAccessCookie) {
    const response = NextResponse.next();
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: "1",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest,
      path: "/",
    });
    return response;
  }

  const inviteFromQuery = nextUrl.searchParams.get(INVITE_QUERY_PARAM);
  if (inviteFromQuery && inviteFromQuery === configuredInviteKey) {
    const cleanUrl = nextUrl.clone();
    cleanUrl.searchParams.delete(INVITE_QUERY_PARAM);

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set({
      name: ACCESS_COOKIE,
      value: "1",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest,
      path: "/",
    });

    return response;
  }

  return new NextResponse(
    "Access restricted. Open your invite link from email to continue.",
    {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }
  );
}

export const config = {
  matcher: ["/:path*"],
};