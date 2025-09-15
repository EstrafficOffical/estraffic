// prisma/seed.ts
import { PrismaClient, OfferMode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- SEED START ---");

  // 1) Админ
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? "12");
  const passwordHash = await bcrypt.hash("admin12345", saltRounds);

  // определим имя поля пароля в твоей схеме: passwordHash или password
  // @ts-ignore — на этапе компиляции поля может не быть в типах, но в рантайме всё ок
  const passwordField: "passwordHash" | "password" =
    "passwordHash" in (prisma.user as any)._dmmf.modelMap.User.fieldsByName
      ? "passwordHash"
      : "password";

  const admin = await prisma.user.upsert({
    where: { email: "ihortkach80@gmail.com" },
    update: { name: "Ihor", [passwordField]: passwordHash } as any,
    create: { name: "Ihor", email: "ihortkach80@gmail.com", [passwordField]: passwordHash } as any,
  });

  console.log("✅ user upserted:", admin.id, admin.email);

  // 2) Офферы
  // Если у тебя enum называется иначе (например, MODE вместо OfferMode),
  // поменяй ниже на свой enum. По умолчанию OfferMode.Auto / OfferMode.Manual ок.
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
    // пропустим дубликаты, если сид запускается повторно
    skipDuplicates: true,
  });
  console.log("✅ offers seeded");

  // 3) Кошелек: аккуратно, без требования уникального userId
  const walletAddress = "TKei3JyHDbgEVZrYYd2uuMXwMHy7H2gN7X";
  const walletChain = "tron";

  const existingWallet = await prisma.wallet.findFirst({
    where: { userId: admin.id, chain: walletChain },
  });

  if (existingWallet) {
    await prisma.wallet.update({
      where: { id: existingWallet.id },
      data: { address: walletAddress, verified: false },
    });
  } else {
    await prisma.wallet.create({
      data: {
        userId: admin.id,
        address: walletAddress,
        chain: walletChain,
        verified: false,
      },
    });
  }
  console.log("✅ wallet upserted");

  // 4) Выплата (создадим, если нет)
  const existingPayout = await prisma.payout.findFirst({
    where: { userId: admin.id, amount: 50, currency: "USDT" },
  });

  if (!existingPayout) {
    await prisma.payout.create({
      data: {
        userId: admin.id,
        amount: 50,
        currency: "USDT",
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
