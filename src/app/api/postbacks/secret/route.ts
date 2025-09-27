// src/app/api/postbacks/secret/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "USER";
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const secret = process.env.POSTBACK_SHARED_SECRET || "";
  return NextResponse.json({ secret });
}
