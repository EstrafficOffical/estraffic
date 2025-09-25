import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["ru", "en"] as const;
const DEFAULT_LOCALE = "ru";

const PUBLIC_FILE = /\.(.*)$/; // .ico, .png, .jpg, .js, .css, и т.д.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Пропускаем API, _next и любые статические файлы (в т.ч. favicon)
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2) Берём первый сегмент
  const seg = pathname.split("/")[1];

  // 3) Если сегмент не локаль — редирект на дефолтную
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
