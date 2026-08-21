// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["ru", "en"] as const;
const DEFAULT_LOCALE = "ru";
const PUBLIC_FILE = /\.(.*)$/;

const PUBLIC_LOCALIZED_PATHS = new Set([
  "",
  "/login",
  "/register",
  "/status",
  "/auth/forgot",
  "/auth/reset",
]);

const OWNER_ADMIN_ONLY = [
  "/admin",
  "/postbacks",
];

const STAFF_PATHS = [
  "/conversions",
];

function isLocale(value: string) {
  return (LOCALES as readonly string[]).includes(value);
}

function localizedPath(pathname: string, locale: string) {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "";
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

function startsWithRoute(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Keep the canonical production host behavior already used by NEXUS.
  const host = req.headers.get("host") || "";
  if (process.env.NODE_ENV === "production" && host === "estraffic.com") {
    const url = req.nextUrl.clone();
    url.host = "www.estraffic.com";
    return NextResponse.redirect(url, 308);
  }

  // API routes perform authorization inside their route handlers.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Tracking must never be forced through locale/auth.
  if (pathname === "/r" || pathname.startsWith("/r/")) {
    return NextResponse.next();
  }

  const firstSeg = pathname.split("/")[1] || "";

  // Normalize accidental /:locale/r/* links back to /r/*.
  if (isLocale(firstSeg) && pathname.startsWith(`/${firstSeg}/r/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(`/${firstSeg}/r/`, "/r/");
    url.search = search;
    return NextResponse.redirect(url, 307);
  }

  // Locale normalization.
  if (!isLocale(firstSeg)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = firstSeg;
  const appPath = localizedPath(pathname, locale);

  // Public pages do not require a session.
  if (PUBLIC_LOCALIZED_PATHS.has(appPath)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Protected pages require an APPROVED account.
  if (!token || token.status !== "APPROVED" || !token.id) {
    const login = req.nextUrl.clone();
    login.pathname = `/${locale}/login`;
    login.search = "";
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const role = String(token.role || "USER");

  // OWNER/ADMIN-only administration and integrations.
  if (
    OWNER_ADMIN_ONLY.some((route) => startsWithRoute(appPath, route)) &&
    !["OWNER", "ADMIN"].includes(role)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Staff conversions are available to OWNER / ADMIN / MANAGER.
  if (
    STAFF_PATHS.some((route) => startsWithRoute(appPath, route)) &&
    !["OWNER", "ADMIN", "MANAGER"].includes(role)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
