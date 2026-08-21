import { NextResponse } from "next/server";
import { auth } from "./auth";

const STAFF_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);
const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

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

export async function requireApproved() {
  const session = await auth();
  const status = (session?.user as any)?.status;
  if (!session?.user) {
    return {
      session: null as any,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (status !== "APPROVED") {
    return {
      session,
      res: NextResponse.json({ error: "Account not approved" }, { status: 403 }),
    };
  }
  return { session, res: null as any };
}

export async function requireStaff() {
  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  if (!session?.user || !STAFF_ROLES.has(role)) {
    return {
      session,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, res: null as any };
}

export async function requireAdmin() {
  const session = await auth();
  const role = String((session?.user as any)?.role || "");
  if (!session?.user || !ADMIN_ROLES.has(role)) {
    return {
      session,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, res: null as any };
}
