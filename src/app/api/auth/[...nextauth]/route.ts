// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

// благодаря shim из lib/auth.ts это будет работать на v4
export const { GET, POST } = handlers;
