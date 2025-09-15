// middleware.ts
import { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "@/lib/i18n";

// i18n middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

// auth middleware (для админки)
const adminAuthMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => token?.role === "ADMIN",
  },
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // проверяем админские пути
  const isAdminPath =
    /^\/(ru|uk|en)\/admin(\/|$)/.test(pathname) ||
    pathname === "/api/offers/create" ||
    pathname.startsWith("/api/offers/create");

  if (isAdminPath) {
    // тут ВАЖНО — вызвать как функцию объекта
    return (adminAuthMiddleware as any)(req);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/",                      
    "/(ru|uk|en)/:path*",     
    "/api/offers/create",     
    "/(ru|uk|en)/admin/:path*"
  ],
};
