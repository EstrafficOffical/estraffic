import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["ru", "en"] as const;
const DEFAULT_LOCALE = "ru";

// пропускаем всё статическое/служебное
const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // первый сегмент пути
  const seg = pathname.split("/")[1];

  // если это не поддерживаемая локаль — добавим префикс локали
  if (!LOCALES.includes(seg as any)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Матчер, чтобы middleware не срабатывал на статику и API
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
