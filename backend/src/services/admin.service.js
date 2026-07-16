import { prisma } from "../config/prisma.js";

export async function getAdminSummary() {
  const [
    registeredKilns,
    linkedKilns,
    operationalKilns,
    registeredControllers,
    linkedControllers,
    operationalControllers,
    registeredUsers,
  ] = await prisma.$transaction([
    prisma.kiln.count(),
    prisma.kiln.count({
      where: {
        OR: [{ userId: { not: null } }, { controllerId: { not: null } }],
      },
    }),
    prisma.kiln.count({
      where: { controller: { is: { operativeStatus: "ON" } } },
    }),
    prisma.controller.count(),
    prisma.controller.count({
      where: {
        OR: [{ userId: { not: null } }, { kiln: { isNot: null } }],
      },
    }),
    prisma.user.count(),
  ]);

  return {
    kilns: {
      registered: registeredKilns,
      linked: linkedKilns,
      operational: operationalKilns,
    },
    controllers: {
      registered: registeredControllers,
      linked: linkedControllers,
      operational: operationalControllers,
    },
    users: { registered: registeredUsers },
  };
}
