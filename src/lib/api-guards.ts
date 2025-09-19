// src/lib/api-guards.ts
import { NextResponse } from "next/server";
import { auth } from "./auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null as any,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, res: null as any };
}

export async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return {
      session,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, res: null as any };
}
