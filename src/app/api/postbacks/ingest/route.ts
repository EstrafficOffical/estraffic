import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const incoming = new URL(req.url);
  const target = new URL(
    "/api/nexus/postback",
    incoming.origin,
  );

  incoming.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  if (!target.searchParams.has("source")) {
    target.searchParams.set("source", "INGEST");
  }

  return NextResponse.redirect(target, 307);
}
