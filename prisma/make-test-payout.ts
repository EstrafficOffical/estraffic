import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "ihortkach80@gmail.com"; // твой админ
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const payout = await prisma.payout.create({
    data: {
      userId: user.id,
      amount: 123.45 as any, // Decimal
      currency: "USDT",
      txHash: "0xTEST123",
    },
  });

  console.log("✅ Payout created:", payout.id);
}

main().finally(() => prisma.$disconnect());
