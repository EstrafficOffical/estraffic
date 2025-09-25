// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Проверка существования произвольного поля в модели User через DMMF
function userFieldExists(field: string): boolean {
  const dmmf = (prisma as any)?._dmmf;
  const userModel =
    dmmf?.modelMap?.User ??
    dmmf?.datamodel?.models?.find((m: any) => m?.name === "User");
  if (!userModel) return false;

  // поддержка разных форм представления в разных версиях клиента
  if (userModel.fieldsByName && field in userModel.fieldsByName) return true;
  if (Array.isArray(userModel.fields)) {
    return userModel.fields.some((f: any) => f?.name === field);
  }
  return false;
}

async function main() {
  console.log("--- SEED START ---");

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? "12");
  const passwordHash = await bcrypt.hash("admin12345", saltRounds);

  // Эти поля опционально добавим, только если существуют в схеме
  const hasRole = userFieldExists("role");
  const hasStatus = userFieldExists("status");
  const hasTelegram = userFieldExists("telegram");

  // passwordHash — ОБЯЗАТЕЛЕН (в твоей схеме), задаём всегда
  const adminUpdate: any = {
    name: "Ihor",
    passwordHash,
  };
  const adminCreate: any = {
    name: "Ihor",
    email: "ihortkach80@gmail.com",
    passwordHash,
  };

  if (hasRole) {
    adminUpdate.role = "ADMIN";
    adminCreate.role = "ADMIN";
  }
  if (hasStatus) {
    adminUpdate.status = "APPROVED";
    adminCreate.status = "APPROVED";
  }
  if (hasTelegram) {
    adminUpdate.telegram = "admin_support";
    adminCreate.telegram = "admin_support";
  }

  const admin = await prisma.user.upsert({
    where: { email: "ihortkach80@gmail.com" },
    update: adminUpdate,
    create: adminCreate,
  });

  console.log("✅ admin upserted:", admin.id, admin.email);
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
