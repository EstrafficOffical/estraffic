/* src/app/api/postbacks/secret/route.ts */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // можно ограничить только для админов:
  // if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const secret = process.env.POSTBACK_SHARED_SECRET || "";
  return NextResponse.json({ secret });
}
