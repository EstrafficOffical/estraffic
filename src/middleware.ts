import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";

const locales = ["ru", "en", "uk"] as const;
const defaultLocale = "ru";

const intl = createIntlMiddleware({
  locales: locales as unknown as string[],
  defaultLocale,
  localePrefix: "always",
});

const adminAuth = withAuth(
  () => NextResponse.next(),
  { callbacks: { authorized: ({ token }) => token?.role === "ADMIN" } }
);

function isAdminPath(pathname: string) {
  return /^\/(ru|en|uk)\/admin(\/|$)/.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Никогда не трогаем тех-пути: критично для /api/auth/callback/google!
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/site.webmanifest" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".txt") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  // 2) Админка — только ADMIN
  if (isAdminPath(pathname)) return (adminAuth as any)(req);

  // 3) Остальное — i18n
  return intl(req);
}

export const config = { matcher: ["/:path*"] };
