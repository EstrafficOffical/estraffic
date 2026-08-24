import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

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

const OWNER_ADMIN_ONLY = ["/admin", "/postbacks"];
const STAFF_PATHS = ["/conversions"];

function isLocale(value: string) {
  return (LOCALES as readonly string[]).includes(value);
}

function localizedPath(pathname: string, locale: string) {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "";
  return pathname.startsWith(`${prefix}/`)
    ? pathname.slice(prefix.length)
    : pathname;
}

function startsWithRoute(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

function loginRedirect(
  req: NextRequest,
  locale: string,
  callbackUrl: string,
  error?: string,
) {
  const login = req.nextUrl.clone();
  login.pathname = `/${locale}/login`;
  login.search = "";
  login.searchParams.set("callbackUrl", callbackUrl);
  if (error) login.searchParams.set("error", error);
  return NextResponse.redirect(login);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host") || "";

  if (
    process.env.NODE_ENV === "production" &&
    host === "estraffic.com"
  ) {
    const url = req.nextUrl.clone();
    url.host = "www.estraffic.com";
    return NextResponse.redirect(url, 308);
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/r" || pathname.startsWith("/r/")) {
    return NextResponse.next();
  }

  const firstSeg = pathname.split("/")[1] || "";

  if (
    isLocale(firstSeg) &&
    pathname.startsWith(`/${firstSeg}/r/`)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(`/${firstSeg}/r/`, "/r/");
    url.search = search;
    return NextResponse.redirect(url, 307);
  }

  if (!isLocale(firstSeg)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = firstSeg;
  const appPath = localizedPath(pathname, locale);

  if (PUBLIC_LOCALIZED_PATHS.has(appPath)) {
    return NextResponse.next();
  }

  const callbackUrl = `${pathname}${search}`;
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
  });

  if (!token || token.status !== "APPROVED" || !token.id) {
    return loginRedirect(req, locale, callbackUrl);
  }

  let dbUser:
    | {
        id: string;
        role: string;
        status: string;
        authVersion: number;
        twoFactor: { enabled: boolean } | null;
      }
    | null = null;

  try {
    dbUser = await prisma.user.findUnique({
      where: { id: String(token.id) },
      select: {
        id: true,
        role: true,
        status: true,
        authVersion: true,
        twoFactor: { select: { enabled: true } },
      },
    });
  } catch (error) {
    console.error("[AUTH] middleware session validation failed", error);
    return loginRedirect(
      req,
      locale,
      callbackUrl,
      "SessionValidationFailed",
    );
  }

  const tokenAuthVersion = Number(token.authVersion ?? 0);

  if (
    !dbUser ||
    dbUser.status !== "APPROVED" ||
    dbUser.authVersion !== tokenAuthVersion
  ) {
    return loginRedirect(req, locale, callbackUrl, "SessionExpired");
  }

  const role = String(dbUser.role || "USER");
  const requiresTwoFactor =
    role === "OWNER" ||
    role === "ADMIN" ||
    dbUser.twoFactor?.enabled === true;

  if (requiresTwoFactor && token.twoFactorVerified !== true) {
    return loginRedirect(req, locale, callbackUrl, "TwoFactorRequired");
  }

  if (
    OWNER_ADMIN_ONLY.some((route) => startsWithRoute(appPath, route)) &&
    !["OWNER", "ADMIN"].includes(role)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

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
  runtime: "nodejs",
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};