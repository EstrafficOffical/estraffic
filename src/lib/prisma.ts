// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// ОДИН синглтон на всё приложение (и dev, и prod)
export const prisma: PrismaClient =
  global.__prisma__ ??
  new PrismaClient({
    // логирование по вкусу:
    // log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

// ВАЖНО: делаем ещё и default-экспорт, чтобы работали импорты вида `import prisma from "@/lib/prisma"`
export default prisma;
