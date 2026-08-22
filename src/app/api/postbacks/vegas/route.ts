import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function disabled() {
  return NextResponse.json(
    {
      ok: false,
      error: "LEGACY_ENDPOINT_DISABLED",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET() {
  return disabled();
}

export async function POST() {
  return disabled();
}
