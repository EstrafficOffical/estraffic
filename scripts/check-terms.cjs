const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.flowTermsVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      version: true,
      advertiserCpa: true,
      affiliateCpa: true,
      currency: true,
      capFtd: true,
      flow: {
        select: { name: true }
      }
    }
  });

  console.table(rows.map(x => ({
    flow: x.flow.name,
    version: x.version,
    advertiserCpa: x.advertiserCpa == null ? null : String(x.advertiserCpa),
    affiliateCpa: x.affiliateCpa == null ? null : String(x.affiliateCpa),
    currency: x.currency,
    capFtd: x.capFtd
  })));

  await prisma.$disconnect();
})();
