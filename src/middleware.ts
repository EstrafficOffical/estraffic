// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["ru", "en"] as const;
const DEFAULT_LOCALE = "ru";

// игнор системных путей и статических файлов
function shouldBypass(pathname: string) {
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico" || pathname.endsWith(".png") || pathname.endsWith(".jpg") || pathname.endsWith(".svg")) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true; // любой файл с расширением
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (shouldBypass(pathname)) return NextResponse.next();

  // берём ПЕРВЫЙ сегмент как локаль
  const seg = pathname.split("/").filter(Boolean)[0];
  const isValid = LOCALES.includes(seg as any);

  if (!isValid) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// матчер: всё, кроме _next и статических файлов
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
