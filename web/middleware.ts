import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Protect each role's area. Logged-out users go to /login; logged-in users in the
// wrong area are redirected to their own dashboard.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  const areas: Record<string, string> = {
    "/worker": "WORKER",
    "/client": "CLIENT",
    "/admin": "ADMIN",
  };

  const guarded = Object.keys(areas).find((p) => pathname.startsWith(p));
  if (!guarded) return NextResponse.next();

  if (!role) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (role !== areas[guarded]) {
    const home = { WORKER: "/worker", CLIENT: "/client", ADMIN: "/admin" }[role] ?? "/";
    return NextResponse.redirect(new URL(home, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/worker/:path*", "/client/:path*", "/admin/:path*"],
};
