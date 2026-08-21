const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const email = "itkachenko21007@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) throw new Error("USER_NOT_FOUND");

  const access = await prisma.flowAccess.findFirst({
    where: {
      userId: user.id,
      status: "APPROVED"
    },
    include: {
      flow: {
        include: {
          market: {
            include: {
              brand: true
            }
          },
          termsVersions: {
            orderBy: { version: "desc" },
            take: 1
          }
        }
      },
      termsVersion: true
    }
  });

  if (!access) throw new Error("APPROVED_FLOW_ACCESS_NOT_FOUND");

  const latest = access.flow.termsVersions[0];

  if (!latest) throw new Error("LATEST_TERMS_NOT_FOUND");

  console.log("Before:");
  console.log({
    brand: access.flow.market.brand.name,
    flow: access.flow.name,
    currentVersion: access.termsVersion?.version ?? null,
    latestVersion: latest.version
  });

  await prisma.flowAccess.update({
    where: { id: access.id },
    data: {
      termsVersionId: latest.id,
      approvedAt: new Date()
    }
  });

  console.log("After:");
  console.log({
    termsVersionId: latest.id,
    version: latest.version,
    advertiserCpa: latest.advertiserCpa?.toString() ?? null,
    affiliateCpa: latest.affiliateCpa?.toString() ?? null,
    currency: latest.currency,
    capFtd: latest.capFtd
  });

  await prisma.$disconnect();
})();
