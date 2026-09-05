import { prisma } from "../config/prisma.js";
import { getSwitchState } from "../utils/entityPresentation.js";

export async function getAdminSummary() {
  const [
    registeredKilns,
    linkedKilns,
    kilnsWithController,
    registeredControllers,
    linkedControllers,
    registeredUsers,
  ] = await prisma.$transaction([
    prisma.kiln.count(),
    prisma.kiln.count({
      where: {
        OR: [{ userId: { not: null } }, { controllerId: { not: null } }],
      },
    }),
    prisma.kiln.findMany({
      where: { controllerId: { not: null } },
      select: { controllerId: true },
    }),
    prisma.controller.count(),
    prisma.controller.count({
      where: {
        OR: [{ userId: { not: null } }, { kiln: { isNot: null } }],
      },
    }),
    prisma.user.count(),
  ]);

  const operationalKilns = kilnsWithController.filter(
    ({ controllerId }) => getSwitchState(controllerId),
  ).length;

  return {
    kilns: {
      registered: registeredKilns,
      linked: linkedKilns,
      operational: operationalKilns,
    },
    controllers: {
      registered: registeredControllers,
      linked: linkedControllers,
    },
    users: { registered: registeredUsers },
  };
}
