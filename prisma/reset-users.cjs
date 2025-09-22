// prisma/reset-users.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("— Resetting users and related data…");

  // 1) wipe related/auth tables first
  await prisma.$transaction([
    prisma.session.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.offerAccess.deleteMany({}),
    prisma.offerRequest.deleteMany({}),
    prisma.wallet.deleteMany({}),
    prisma.payout.deleteMany({}),
  ]);

  // 2) detach userId in event tables (to keep data history)
  await prisma.click.updateMany({ data: { userId: null } });
  await prisma.conversion.updateMany({ data: { userId: null } });

  // 3) remove all users
  await prisma.user.deleteMany({});
  console.log("✓ All users removed");

  // 4) create admin
  const admin = await prisma.user.create({
    data: {
      email: "ihortkach80@gmail.com",
      name: "Ihor Admin",
      passwordHash: await bcrypt.hash("ihor2007", 10),
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  // 5) create tester user
  const tester = await prisma.user.create({
    data: {
      email: "tester@local.test",
      name: "Demo Tester",
      passwordHash: await bcrypt.hash("test1234", 10),
      role: "USER",
      status: "APPROVED",
    },
  });

  console.log("✓ Admin:", admin.email);
  console.log("✓ Tester:", tester.email);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
