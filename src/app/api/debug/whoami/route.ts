import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
export async function GET() {
  const session = await auth();
  return NextResponse.json({
    authed: !!session?.user,
    user: session?.user
      ? {
          email: session.user.email,
          id: (session.user as any).id,
          role: (session.user as any).role,
          status: (session.user as any).status,
        }
      : null,
  });
}
