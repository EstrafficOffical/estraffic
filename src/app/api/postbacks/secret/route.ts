import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasRecentStepUp } from "@/lib/nexus-step-up";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = String(
    (session?.user as any)?.id || "",
  );
  const role = String(
    (session?.user as any)?.role || "",
  );

  if (
    !userId ||
    !["OWNER", "ADMIN"].includes(role)
  ) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (!(await hasRecentStepUp(userId))) {
    return NextResponse.json(
      { error: "STEP_UP_REQUIRED" },
      {
        status: 428,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const secret =
    process.env.POSTBACK_SHARED_SECRET || "";

  await prisma.nexusSecurityEvent.create({
    data: {
      eventType: "POSTBACK_SECRET_REVEALED",
      userId,
      metadata: {
        role,
      },
    },
  });

  return NextResponse.json(
    { secret },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
