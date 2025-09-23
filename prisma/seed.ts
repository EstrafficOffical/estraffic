// prisma/seed.ts
import { PrismaClient, OfferMode } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- SEED START ---");

  // 1) Админ-аккаунт
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? "12");
  const passwordHash = await bcrypt.hash("admin12345", saltRounds);

  // формируем данные с безопасным кастом, чтобы TS не ругался на role/status
  const adminUpdate: any = {
    name: "Ihor",
    passwordHash,
    role: "ADMIN",          // если в схеме enum Role — ок; если строки — тоже ок
    status: "APPROVED",     // если в схеме enum UserStatus — ок; если строки — ок
  };

  const adminCreate: any = {
    name: "Ihor",
    email: "ihortkach80@gmail.com",
    passwordHash,
    role: "ADMIN",
    status: "APPROVED",
  };

  const admin = await prisma.user.upsert({
    where: { email: "ihortkach80@gmail.com" },
    update: adminUpdate,
    create: adminCreate,
  });

  console.log("✅ user upserted:", admin.id, admin.email);

  // 2) Офферы (skipDuplicates — чтобы сид можно было гонять повторно)
  await prisma.offer.createMany({
    data: [
      {
        title: "Crypto App Install",
        tag: "Exclusive",
        cpa: 300,
        geo: "US",
        vertical: "Finance",
        kpi1: 1.2,
        kpi2: 1.1,
        mode: OfferMode.Auto,
      },
      {
        title: "Dating Signup",
        tag: "Trending",
        cpa: 150,
        geo: "UA",
        vertical: "Dating",
        kpi1: 0.9,
        kpi2: 0.7,
        mode: OfferMode.Manual,
      },
      {
        title: "Gaming Gold",
        tag: "Whitelist",
        cpa: 200,
        geo: "DE",
        vertical: "Gaming",
        kpi1: 1.4,
        kpi2: 1.3,
        mode: OfferMode.Auto,
      },
    ],
    skipDuplicates: true,
  });
  console.log("✅ offers seeded");

  // 3) Кошелёк (в твоей модели НЕТ поля chain — не используем его)
  const walletAddress = "TKei3JyHDbgEVZrYYd2uuMXwMHy7H2gN7X";

  const existingWallet = await prisma.wallet.findFirst({
    where: { userId: admin.id, address: walletAddress },
  });

  if (existingWallet) {
    await prisma.wallet.update({
      where: { id: existingWallet.id },
      data: {
        label: existingWallet.label ?? "Primary",
        address: walletAddress,
        isPrimary: true,
        verified: false,
      },
    });
  } else {
    await prisma.wallet.create({
      data: {
        userId: admin.id,
        label: "Primary",
        address: walletAddress,
        isPrimary: true,
        verified: false,
      },
    });
  }
  console.log("✅ wallet upserted");

  // 4) Пример выплаты
  const existingPayout = await prisma.payout.findFirst({
    where: { userId: admin.id, amount: 50, currency: "USDT" },
  });

  if (!existingPayout) {
    await prisma.payout.create({
      data: {
        userId: admin.id,
        amount: 50,
        currency: "USDT",
        // если status обязателен в схеме Payout — добавь нужное значение здесь
      },
    });
    console.log("✅ payout created");
  } else {
    console.log("ℹ payout already exists");
  }

  console.log("--- SEED DONE ---");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
