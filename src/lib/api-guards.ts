import { NextResponse } from "next/server";
import { auth } from "./auth";

const STAFF_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);
const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null as any,
      res: unauthorized(),
    };
  }

  return { session, res: null as any };
}

export async function requireApproved() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null as any,
      res: unauthorized(),
    };
  }

  const status = String((session.user as any)?.status || "");

  if (status !== "APPROVED") {
    return {
      session,
      res: forbidden("Account not approved"),
    };
  }

  return { session, res: null as any };
}

export async function requireStaff() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null as any,
      res: unauthorized(),
    };
  }

  const user = session.user as any;
  const role = String(user?.role || "");
  const status = String(user?.status || "");
  const twoFactorVerified = user?.twoFactorVerified === true;

  if (status !== "APPROVED") {
    return {
      session,
      res: forbidden("Account not approved"),
    };
  }

  if (!STAFF_ROLES.has(role)) {
    return {
      session,
      res: forbidden(),
    };
  }

  if (ADMIN_ROLES.has(role) && !twoFactorVerified) {
    return {
      session,
      res: forbidden("Two-factor authentication required"),
    };
  }

  return { session, res: null as any };
}

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null as any,
      res: unauthorized(),
    };
  }

  const user = session.user as any;
  const role = String(user?.role || "");
  const status = String(user?.status || "");
  const twoFactorVerified = user?.twoFactorVerified === true;

  if (status !== "APPROVED") {
    return {
      session,
      res: forbidden("Account not approved"),
    };
  }

  if (!ADMIN_ROLES.has(role)) {
    return {
      session,
      res: forbidden(),
    };
  }

  if (!twoFactorVerified) {
    return {
      session,
      res: forbidden("Two-factor authentication required"),
    };
  }

  return { session, res: null as any };
}
