// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["ru", "en"] as const;
const DEFAULT_LOCALE = "ru";
const PUBLIC_FILE = /\.(.*)$/; // .ico, .png, .jpg, .js, .css и т.д.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Принудительно на www в проде, чтобы домен для cookies всегда совпадал
  const host = req.headers.get("host") || "";
  if (process.env.NODE_ENV === "production" && host === "estraffic.com") {
    const url = req.nextUrl.clone();
    url.host = "www.estraffic.com";
    return NextResponse.redirect(url, 308);
  }

  // 1) Пропускаем API, _next и статические файлы
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // 2) Локализация — проверяем первый сегмент
  const seg = pathname.split("/")[1];
  if (!LOCALES.includes(seg as any)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
