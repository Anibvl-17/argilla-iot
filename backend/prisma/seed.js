import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 10;

const admin = {
  email: process.env.SEED_ADMIN_EMAIL || "admin@argilla.test",
  name: process.env.SEED_ADMIN_NAME || "Administrador Argilla",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
};

const demoPassword = process.env.SEED_DEMO_PASSWORD || "Password123!";
const users = [
  { key: "maria", email: "maria@argilla.test", name: "María" },
  { key: "jose", email: "jose@argilla.test", name: "José" },
  { key: "ana", email: "ana@argilla.test", name: "Ana" },
  { key: "carlos", email: "carlos@argilla.test", name: "Carlos" },
  { key: "valentina", email: "valentina@argilla.test", name: "Valentina" },
];

const controllerIds = {
  maria: "11111111-1111-4111-8111-111111111111",
  jose: "22222222-2222-4222-8222-222222222222",
  carlos: "33333333-3333-4333-8333-333333333333",
  valentina: "44444444-4444-4444-8444-444444444444",
  orphan1: "55555555-5555-4555-8555-555555555555",
  orphan2: "66666666-6666-4666-8666-666666666666",
};

const kilnDefaults = {
  liters: 40,
  phases: 1,
  volts: 220,
  amps: 20,
};

async function createUserIfMissing({ email, name, role, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name,
      role,
      password: await bcrypt.hash(password, PASSWORD_ROUNDS),
    },
  });
}

async function createControllerIfMissing(controllerId, data = {}) {
  const existing = await prisma.controller.findUnique({
    where: { controllerId },
  });
  if (existing) return existing;

  return prisma.controller.create({
    data: {
      controllerId,
      userId: data.userId ?? null,
      pin: data.pin ?? null,
      switchType: data.switchType ?? "CONTACTOR",
      switchAmps: data.switchAmps ?? 25,
    },
  });
}

async function createKilnIfMissing(name, data, aliases = []) {
  const existing = await prisma.kiln.findFirst({
    where: { name: { in: [name, ...aliases] } },
  });
  if (existing) return existing;

  let controllerId = data.controllerId ?? null;
  if (controllerId) {
    const controller = await prisma.controller.findUnique({
      where: { controllerId },
      include: { kiln: { select: { kilnId: true } } },
    });
    if (!controller || controller.kiln) controllerId = null;
  }

  return prisma.kiln.create({
    data: {
      ...kilnDefaults,
      ...data,
      name,
      controllerId,
    },
  });
}

async function main() {
  await createUserIfMissing({
    email: admin.email,
    name: admin.name,
    password: admin.password,
    role: "ADMIN",
  });

  const seededUsers = {};
  for (const user of users) {
    seededUsers[user.key] = await createUserIfMissing({
      ...user,
      password: demoPassword,
      role: "USER",
    });
  }

  await createControllerIfMissing(controllerIds.maria, {
    userId: seededUsers.maria.userId,
  });
  await createControllerIfMissing(controllerIds.jose, {
    userId: seededUsers.jose.userId,
  });
  await createControllerIfMissing(controllerIds.carlos, {
    userId: seededUsers.carlos.userId,
  });
  await createControllerIfMissing(controllerIds.valentina, {
    userId: seededUsers.valentina.userId,
  });
  await createControllerIfMissing(controllerIds.orphan1);
  await createControllerIfMissing(controllerIds.orphan2);

  await createKilnIfMissing(
    "Horno de María",
    {
      userId: seededUsers.maria.userId,
      controllerId: controllerIds.maria,
      liters: 50,
      amps: 20,
    },
    ["Horno de Maria"],
  );
  await createKilnIfMissing(
    "Horno de José",
    {
      userId: seededUsers.jose.userId,
      controllerId: controllerIds.jose,
      liters: 60,
      amps: 25,
    },
    ["Horno de Jose"],
  );
  await createKilnIfMissing("Horno de Ana", {
    userId: seededUsers.ana.userId,
    liters: 35,
    amps: 18,
  });
  await createKilnIfMissing("Horno de Valentina", {
    userId: seededUsers.valentina.userId,
    liters: 45,
    amps: 20,
  });
  await createKilnIfMissing(
    "Horno huérfano 1",
    { liters: 30, amps: 16 },
    ["Horno huerfano 1"],
  );
  await createKilnIfMissing(
    "Horno huérfano 2",
    { liters: 70, phases: 3, volts: 380, amps: 30 },
    ["Horno huerfano 2"],
  );

  console.log("Seed listo; los registros existentes no fueron modificados.");
  console.log(`Administrador: ${admin.email}`);
  console.log(`Ceramistas: ${users.map((user) => user.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
