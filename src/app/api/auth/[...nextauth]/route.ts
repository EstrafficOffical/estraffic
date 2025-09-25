// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs';        // <<< обязателен для Prisma
export const dynamic = 'force-dynamic'; // чтобы роут не кешировался
export const revalidate = 0;

import { handlers } from "@/lib/auth";

// shim из lib/auth.ts делает это совместимым с app router
export const { GET, POST } = handlers;
