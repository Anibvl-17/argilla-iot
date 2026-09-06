import { prisma } from "../config/prisma.js";

export async function getAdminSummary() {
  const [
    totalKilns,
    kilnsWithOwner,
    operationalKilns,
    outOfServiceKilns,
    totalControllers,
    controllersWithOwner,
    operationalControllers,
    outOfServiceControllers,
    totalUsers,
    technicians,
    clients,
  ] = await prisma.$transaction([
    prisma.kiln.count(),
    prisma.kiln.count({ where: { userId: { not: null } } }),
    prisma.kiln.count({ where: { operationalStatus: "OPERATIONAL" } }),
    prisma.kiln.count({ where: { operationalStatus: "OUT_OF_SERVICE" } }),
    prisma.controller.count(),
    prisma.controller.count({ where: { userId: { not: null } } }),
    prisma.controller.count({ where: { operationalStatus: "OPERATIONAL" } }),
    prisma.controller.count({
      where: { operationalStatus: "OUT_OF_SERVICE" },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "TECHNICIAN" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
  ]);

  return {
    kilns: {
      total: totalKilns,
      withOwner: kilnsWithOwner,
      operational: operationalKilns,
      outOfService: outOfServiceKilns,
    },
    controllers: {
      total: totalControllers,
      withOwner: controllersWithOwner,
      operational: operationalControllers,
      outOfService: outOfServiceControllers,
    },
    users: {
      total: totalUsers,
      technicians,
      clients,
    },
  };
}
