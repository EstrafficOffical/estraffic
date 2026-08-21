import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = String(process.env.NEXUS_OWNER_EMAIL || "").trim().toLowerCase();
const password = String(process.env.NEXUS_OWNER_PASSWORD || "");
const name = String(process.env.NEXUS_OWNER_NAME || "NEXUS Owner").trim();

if (!email || !password) {
  console.error("Set NEXUS_OWNER_EMAIL and NEXUS_OWNER_PASSWORD before running this script.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use an owner password with at least 12 characters.");
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await prisma.user.upsert({
    where: { email },
    update: { role: "OWNER", status: "APPROVED", passwordHash, name },
    create: {
      email,
      name,
      passwordHash,
      role: "OWNER",
      status: "APPROVED",
      tier: 1,
    },
    select: { id: true, email: true, role: true, status: true },
  });
  console.log(`OWNER ready: ${owner.email} (${owner.role}, ${owner.status})`);
} finally {
  await prisma.$disconnect();
}
