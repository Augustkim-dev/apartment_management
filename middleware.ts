import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // /dashboard로 시작하는 경로는 admin만 접근 가능
    if (path.startsWith("/dashboard")) {
      if (!token || token.role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // /my로 시작하는 경로는 로그인한 사용자만 접근 가능
    if (path.startsWith("/my")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/my/:path*",
    "/api/bills/:path*",
    "/api/units/:path*",
    "/api/users/:path*",
  ],
};