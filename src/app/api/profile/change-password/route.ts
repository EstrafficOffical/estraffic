import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const id = String((session.user as any).id || "");
  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (
    !currentPassword ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return NextResponse.json(
      { error: "VALIDATION" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      passwordHash: true,
      status: true,
    },
  });

  if (!user?.passwordHash || user.status !== "APPROVED") {
    return NextResponse.json(
      { error: "NO_LOCAL_PASSWORD" },
      { status: 400 },
    );
  }

  const ok = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!ok) {
    return NextResponse.json(
      { error: "WRONG_PASSWORD" },
      { status: 400 },
    );
  }

  const configuredRounds = Number.parseInt(
    String(process.env.BCRYPT_SALT_ROUNDS ?? "12"),
    10,
  );

  const rounds = Number.isFinite(configuredRounds)
    ? Math.min(Math.max(configuredRounds, 10), 15)
    : 12;

  const passwordHash = await bcrypt.hash(newPassword, rounds);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        authVersion: { increment: 1 },
      },
    }),
    prisma.nexusLoginChallenge.deleteMany({
      where: { userId: id },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
