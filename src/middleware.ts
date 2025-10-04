// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["ru", "en"] as const;
const DEFAULT_LOCALE = "ru";
const PUBLIC_FILE = /\.(.*)$/; // .ico, .png, .jpg, .js, .css и т.д.

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 0) Принудительно на www в проде (cookie-домен единый)
  const host = req.headers.get("host") || "";
  if (process.env.NODE_ENV === "production" && host === "estraffic.com") {
    const url = req.nextUrl.clone();
    url.host = "www.estraffic.com";
    return NextResponse.redirect(url, 308);
  }

  // 1) Пропускаем API, _next и статические файлы как есть
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // 2) Полностью исключаем трекер /r/* из локализации
  //    (чтобы /r/of_demo... не превращалось в /ru/r/of_demo...)
  if (pathname === "/r" || pathname.startsWith("/r/")) {
    return NextResponse.next();
  }

  // 3) Если вдруг пришли на локализованный путь /:locale/r/* — редиректим на /r/*
  const firstSeg = pathname.split("/")[1] || "";
  if ((LOCALES as readonly string[]).includes(firstSeg) && pathname.startsWith(`/${firstSeg}/r/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(`/${firstSeg}/r/`, "/r/");
    // сохраняем query string
    url.search = search;
    return NextResponse.redirect(url, 307);
  }

  // 4) Локализация: если первый сегмент не локаль — префиксуем дефолтную
  if (!(LOCALES as readonly string[]).includes(firstSeg)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Не исключаем /r из matcher, чтобы правило (3) работало,
  // а исключение /r выполняем в самой функции выше.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
