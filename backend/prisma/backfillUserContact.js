import { PrismaClient } from "@prisma/client";
import { normalizeLegacyInternationalPhone } from "../src/utils/userContact.js";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { userId: true, phone: true },
  });

  let normalized = 0;
  let cleared = 0;

  for (const user of users) {
    const phone = normalizeLegacyInternationalPhone(user.phone);
    if (phone === user.phone) continue;

    await prisma.user.update({
      where: { userId: user.userId },
      data: { phone },
    });

    if (phone) normalized += 1;
    else cleared += 1;
  }

  console.log(
    `[BACKFILL] Teléfonos normalizados: ${normalized}; eliminados por ambigüedad o invalidez: ${cleared}`,
  );
}

main()
  .catch((error) => {
    console.error(
      "[BACKFILL] Error al normalizar teléfonos de usuarios",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
