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

const demoUsers = [
  {
    key: "maria",
    email: "maria@argilla.test",
    name: "María Torres",
    controllers: [{ key: "main", id: "11111111-1111-4111-8111-111111111111" }],
    kilns: [
      {
        name: "Horno de María",
        controllerKey: "main",
        liters: 50,
        amps: 20,
        aliases: ["Horno de Maria"],
      },
    ],
  },
  {
    key: "jose",
    email: "jose@argilla.test",
    name: "José Morales",
    controllers: [
      { key: "workshop-a", id: "22222222-2222-4222-8222-222222222221" },
      { key: "workshop-b", id: "22222222-2222-4222-8222-222222222222" },
    ],
    kilns: [
      {
        name: "Horno gres de José",
        controllerKey: "workshop-a",
        liters: 60,
        amps: 25,
        aliases: ["Horno de José", "Horno de Jose"],
      },
      {
        name: "Horno esmaltes de José",
        controllerKey: "workshop-b",
        liters: 35,
        amps: 18,
      },
    ],
  },
  {
    key: "ana",
    email: "ana@argilla.test",
    name: "Ana Rojas",
    controllers: [],
    kilns: [{ name: "Horno de Ana", liters: 35, amps: 18 }],
  },
  {
    key: "carlos",
    email: "carlos@argilla.test",
    name: "Carlos Vega",
    controllers: [{ key: "spare", id: "33333333-3333-4333-8333-333333333333" }],
    kilns: [],
  },
  {
    key: "valentina",
    email: "valentina@argilla.test",
    name: "Valentina Soto",
    controllers: [{ key: "unlinked", id: "44444444-4444-4444-8444-444444444444" }],
    kilns: [{ name: "Horno de Valentina", liters: 45, amps: 20 }],
  },
  {
    key: "sofia",
    email: "sofia@argilla.test",
    name: "Sofía Lagos",
    controllers: [],
    kilns: [],
  },
  {
    key: "diego",
    email: "diego@argilla.test",
    name: "Diego Fuentes",
    controllers: [],
    kilns: [],
  },
  {
    key: "camila",
    email: "camila@argilla.test",
    name: "Camila Paredes",
    controllers: [],
    kilns: [
      { name: "Horno mural de Camila", liters: 80, phases: 3, volts: 380, amps: 32 },
      { name: "Horno joyería de Camila", liters: 18, amps: 10 },
    ],
  },
  {
    key: "tomas",
    email: "tomas@argilla.test",
    name: "Tomás Herrera",
    controllers: [
      { key: "mobile-a", id: "77777777-7777-4777-8777-777777777771" },
      { key: "mobile-b", id: "77777777-7777-4777-8777-777777777772" },
    ],
    kilns: [],
  },
  {
    key: "isabel",
    email: "isabel@argilla.test",
    name: "Isabel Navarro",
    controllers: [
      { key: "stock-a", id: "88888888-8888-4888-8888-888888888881", switchAmps: 25 },
      { key: "stock-b", id: "88888888-8888-4888-8888-888888888882", switchAmps: 40 },
      { key: "stock-c", id: "88888888-8888-4888-8888-888888888883", switchType: "SSR" },
    ],
    kilns: [],
  },
  {
    key: "renata",
    email: "renata@argilla.test",
    name: "Renata Silva",
    controllers: [
      { key: "small", id: "99999999-9999-4999-8999-999999999991" },
      { key: "large", id: "99999999-9999-4999-8999-999999999992", switchAmps: 40 },
    ],
    kilns: [
      { name: "Horno pruebas de Renata", controllerKey: "small", liters: 30, amps: 16 },
      {
        name: "Horno producción de Renata",
        controllerKey: "large",
        liters: 100,
        phases: 3,
        volts: 380,
        amps: 32,
      },
    ],
  },
  {
    key: "felipe",
    email: "felipe@argilla.test",
    name: "Felipe Contreras",
    controllers: [
      { key: "kiln-1", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1" },
      { key: "kiln-2", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2" },
      { key: "kiln-3", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3" },
      { key: "kiln-4", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", switchAmps: 40 },
      { key: "kiln-5", id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5", switchAmps: 40 },
    ],
    kilns: [
      { name: "Horno bizcocho de Felipe", controllerKey: "kiln-1", liters: 45, amps: 20 },
      { name: "Horno rakú de Felipe", controllerKey: "kiln-2", liters: 55, amps: 22 },
      { name: "Horno porcelana de Felipe", controllerKey: "kiln-3", liters: 65, amps: 25 },
      {
        name: "Horno comunitario de Felipe",
        controllerKey: "kiln-4",
        liters: 120,
        phases: 3,
        volts: 380,
        amps: 35,
      },
      {
        name: "Horno taller norte de Felipe",
        controllerKey: "kiln-5",
        liters: 90,
        phases: 3,
        volts: 380,
        amps: 30,
      },
    ],
  },
  {
    key: "paula",
    email: "paula@argilla.test",
    name: "Paula Medina",
    controllers: [{ key: "linked", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
    kilns: [
      { name: "Horno principal de Paula", controllerKey: "linked", liters: 70, amps: 28 },
      { name: "Horno pendiente de Paula", liters: 40, amps: 20 },
    ],
  },
  {
    key: "andres",
    email: "andres@argilla.test",
    name: "Andrés Salazar",
    controllers: [
      { key: "linked", id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1" },
      { key: "backup", id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2" },
    ],
    kilns: [{ name: "Horno de Andrés", controllerKey: "linked", liters: 55, amps: 22 }],
  },
  {
    key: "elena",
    email: "elena@argilla.test",
    name: "Elena Muñoz",
    controllers: [
      { key: "kiln-a", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1" },
      { key: "kiln-b", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2" },
      { key: "kiln-c", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3", switchType: "SSR" },
      { key: "spare", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4" },
    ],
    kilns: [
      { name: "Horno esmalte Elena", controllerKey: "kiln-a", liters: 42, amps: 18 },
      {
        name: "Horno esculturas Elena",
        controllerKey: "kiln-b",
        liters: 85,
        phases: 3,
        volts: 380,
        amps: 30,
      },
      { name: "Horno laboratorio Elena", controllerKey: "kiln-c", liters: 25, amps: 12 },
    ],
  },
];

const orphanControllers = [
  { id: "55555555-5555-4555-8555-555555555555", switchAmps: 25 },
  { id: "66666666-6666-4666-8666-666666666666", switchType: "SSR", switchAmps: 30 },
  { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", switchAmps: 40 },
];

const orphanKilns = [
  { name: "Horno huérfano 1", liters: 30, amps: 16, aliases: ["Horno huerfano 1"] },
  {
    name: "Horno huérfano 2",
    liters: 70,
    phases: 3,
    volts: 380,
    amps: 30,
    aliases: ["Horno huerfano 2"],
  },
  { name: "Horno huérfano 3", liters: 45, amps: 20 },
];

const kilnDefaults = {
  liters: 40,
  phases: 1,
  volts: 220,
  amps: 20,
};

async function createUserIfMissing({ email, name, role, password }) {
  const hashedPassword = await bcrypt.hash(password, PASSWORD_ROUNDS);

  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role, password: hashedPassword },
  });
}

async function createControllerIfMissing(controllerId, data = {}) {
  const controller = await prisma.controller.findUnique({
    where: { controllerId },
  });

  if (controller) {
    return prisma.controller.update({
      where: { controllerId },
      data: {
        userId: data.userId ?? null,
        pin: data.pin ?? null,
        switchType: data.switchType ?? "CONTACTOR",
        switchAmps: data.switchAmps ?? 25,
      },
    });
  }

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
    orderBy: { kilnId: "asc" },
  });

  let controllerId = data.controllerId ?? null;
  if (controllerId) {
    const controller = await prisma.controller.findUnique({
      where: { controllerId },
      include: { kiln: { select: { kilnId: true } } },
    });

    if (!controller) {
      controllerId = null;
    } else if (controller.kiln && controller.kiln.kilnId !== existing?.kilnId) {
      await prisma.kiln.update({
        where: { kilnId: controller.kiln.kilnId },
        data: { controllerId: null },
      });
    }
  }

  if (existing) {
    return prisma.kiln.update({
      where: { kilnId: existing.kilnId },
      data: {
        ...kilnDefaults,
        ...data,
        name,
        userId: data.userId ?? null,
        controllerId,
      },
    });
  }

  return prisma.kiln.create({
    data: {
      ...kilnDefaults,
      ...data,
      name,
      userId: data.userId ?? null,
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
  for (const user of demoUsers) {
    seededUsers[user.key] = await createUserIfMissing({
      ...user,
      password: demoPassword,
      role: "USER",
    });
  }

  for (const user of demoUsers) {
    const userId = seededUsers[user.key].userId;
    const controllerByKey = {};

    for (const controller of user.controllers) {
      await createControllerIfMissing(controller.id, {
        userId,
        switchType: controller.switchType,
        switchAmps: controller.switchAmps,
      });
      controllerByKey[controller.key] = controller.id;
    }

    for (const kiln of user.kilns) {
      await createKilnIfMissing(
        kiln.name,
        {
          userId,
          controllerId: kiln.controllerKey ? controllerByKey[kiln.controllerKey] : null,
          liters: kiln.liters,
          phases: kiln.phases,
          volts: kiln.volts,
          amps: kiln.amps,
        },
        kiln.aliases,
      );
    }
  }

  const unlinkedControllerIds = demoUsers.flatMap((user) => {
    const linkedControllerKeys = new Set(
      user.kilns.map((kiln) => kiln.controllerKey).filter(Boolean),
    );

    return user.controllers
      .filter((controller) => !linkedControllerKeys.has(controller.key))
      .map((controller) => controller.id);
  });

  for (const controller of orphanControllers) {
    await createControllerIfMissing(controller.id, {
      switchType: controller.switchType,
      switchAmps: controller.switchAmps,
    });
  }

  await prisma.kiln.updateMany({
    where: {
      controllerId: {
        in: [
          ...unlinkedControllerIds,
          ...orphanControllers.map((controller) => controller.id),
        ],
      },
    },
    data: { controllerId: null },
  });

  for (const kiln of orphanKilns) {
    await createKilnIfMissing(
      kiln.name,
      {
        liters: kiln.liters,
        phases: kiln.phases,
        volts: kiln.volts,
        amps: kiln.amps,
      },
      kiln.aliases,
    );
  }

  console.log("Seed listo; los registros demo fueron creados o normalizados.");
  console.log(`Administrador: ${admin.email}`);
  console.log(`Ceramistas: ${demoUsers.map((user) => user.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
