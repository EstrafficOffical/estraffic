const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  const staff = await prisma.user.findMany({
    where: {
      status: "APPROVED",
      role: {
        in: ["OWNER", "ADMIN"],
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      twoFactor: {
        select: {
          enabled: true,
          confirmedAt: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { email: "asc" },
    ],
  });

  console.log("\nOWNER / ADMIN 2FA readiness:");
  console.table(
    staff.map((user) => ({
      email: user.email,
      role: user.role,
      enabled: Boolean(user.twoFactor?.enabled),
      confirmedAt:
        user.twoFactor?.confirmedAt?.toISOString() || "",
    })),
  );

  const missing = staff.filter(
    (user) => !user.twoFactor?.enabled,
  );

  if (missing.length) {
    console.error(
      "\nENFORCEMENT READINESS FAILED: every approved OWNER/ADMIN must enable 2FA before login enforcement.",
    );

    for (const user of missing) {
      console.error(` - ${user.role}: ${user.email}`);
    }

    process.exitCode = 1;
    return;
  }

  if (!staff.some((user) => user.role === "OWNER")) {
    throw new Error("No APPROVED OWNER account found.");
  }

  console.log("\n2FA ENFORCEMENT READINESS PASSED.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
