// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";

// --- локали проекта
const locales = ["ru", "en", "uk"] as const;
const defaultLocale = "ru";

// i18n-middleware (НЕ трогаем /api, /_next, статику и файлы)
const intl = createIntlMiddleware({
  locales: locales as unknown as string[],
  defaultLocale,
  localePrefix: "always", // у тебя префиксная маршрутизация /{locale}/...
});

// Отдельный middleware для админ-роутов
const adminAuth = withAuth(
  // просто пропускаем дальше, проверка — в callbacks
  function (_req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => token?.role === "ADMIN", // только ADMIN
    },
  }
);

// Какие пути считаем "админскими"
function isAdminPath(pathname: string) {
  // /{locale}/admin/**
  return /^\/(ru|en|uk)\/admin(\/|$)/.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Полностью пропускаем тех.пути, чтобы не ломать Auth/OAuth:
  //    /api/**, /_next/**, static файлы, иконки, sitemap/robots
  if (
    pathname.startsWith("/api/") ||               // <-- критично для /api/auth/**
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

  // 2) Админ-роуты — через withAuth (проверка роли)
  if (isAdminPath(pathname)) {
    return (adminAuth as any)(req);
  }

  // 3) Остальное — через i18n (добавление/валидирование локали)
  return intl(req);
}

// matcher оставляем максимально широким, т.к. фильтруем вручную в коде выше
export const config = {
  matcher: ["/:path*"],
};
