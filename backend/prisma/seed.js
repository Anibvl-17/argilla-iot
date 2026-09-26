import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";
import {
  CHILE_REGIONS,
  COUNTRIES,
} from "../src/constants/userContact.constants.js";
import { syncGlobalPrograms } from "./syncGlobalPrograms.js";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 10;
const DEVICE_SECRET_ROUNDS = 10;
const seedDeviceSecret =
  process.env.SEED_DEVICE_SECRET || "argilla-local-device-secret-change-me";

const supportReasons = [
  { code: "FIRING_PROBLEM", name: "Problema de quema" },
  { code: "TEMPERATURE", name: "Problema de temperatura" },
  { code: "CONTROLLER", name: "Problema con controlador" },
  { code: "ELECTRICAL", name: "Problema eléctrico" },
  { code: "CONNECTIVITY", name: "Problema de conectividad" },
  { code: "OTHER", name: "Otro" },
];

const admin = {
  email: process.env.SEED_ADMIN_EMAIL || "admin@argilla.test",
  name: process.env.SEED_ADMIN_NAME || "Administrador Argilla",
  password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
};

const technician = {
  email: process.env.SEED_TECHNICIAN_EMAIL || "tecnico@argilla.test",
  name: process.env.SEED_TECHNICIAN_NAME || "Técnico Argilla",
  password: process.env.SEED_TECHNICIAN_PASSWORD || "Tecnico123!",
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
        nominalCurrent: 20,
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
        nominalCurrent: 25,
      },
      {
        name: "Horno esmaltes de José",
        controllerKey: "workshop-b",
        liters: 35,
        nominalCurrent: 18,
      },
    ],
  },
  {
    key: "ana",
    email: "ana@argilla.test",
    name: "Ana Rojas",
    controllers: [],
    kilns: [{ name: "Horno de Ana", liters: 35, nominalCurrent: 18 }],
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
    controllers: [
      { key: "unlinked", id: "44444444-4444-4444-8444-444444444444" },
    ],
    kilns: [{ name: "Horno de Valentina", liters: 45, nominalCurrent: 20 }],
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
      {
        name: "Horno mural de Camila",
        liters: 80,
        phaseCount: 3,
        nominalVoltage: 380,
        nominalCurrent: 32,
      },
      { name: "Horno joyería de Camila", liters: 18, nominalCurrent: 10 },
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
      {
        key: "stock-a",
        id: "88888888-8888-4888-8888-888888888881",
        switchCurrentCapacity: 25,
      },
      {
        key: "stock-b",
        id: "88888888-8888-4888-8888-888888888882",
        switchCurrentCapacity: 40,
      },
      {
        key: "stock-c",
        id: "88888888-8888-4888-8888-888888888883",
        switchType: "SSR",
      },
    ],
    kilns: [],
  },
  {
    key: "renata",
    email: "renata@argilla.test",
    name: "Renata Silva",
    controllers: [
      { key: "small", id: "99999999-9999-4999-8999-999999999991" },
      {
        key: "large",
        id: "99999999-9999-4999-8999-999999999992",
        switchCurrentCapacity: 40,
      },
    ],
    kilns: [
      {
        name: "Horno pruebas de Renata",
        controllerKey: "small",
        liters: 30,
        nominalCurrent: 16,
      },
      {
        name: "Horno producción de Renata",
        controllerKey: "large",
        liters: 100,
        phaseCount: 3,
        nominalVoltage: 380,
        nominalCurrent: 32,
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
      {
        key: "kiln-4",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
        switchCurrentCapacity: 40,
      },
      {
        key: "kiln-5",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
        switchCurrentCapacity: 40,
      },
    ],
    kilns: [
      {
        name: "Horno bizcocho de Felipe",
        controllerKey: "kiln-1",
        liters: 45,
        nominalCurrent: 20,
      },
      {
        name: "Horno rakú de Felipe",
        controllerKey: "kiln-2",
        liters: 55,
        nominalCurrent: 22,
      },
      {
        name: "Horno porcelana de Felipe",
        controllerKey: "kiln-3",
        liters: 65,
        nominalCurrent: 25,
      },
      {
        name: "Horno comunitario de Felipe",
        controllerKey: "kiln-4",
        liters: 120,
        phaseCount: 3,
        nominalVoltage: 380,
        nominalCurrent: 35,
      },
      {
        name: "Horno taller norte de Felipe",
        controllerKey: "kiln-5",
        liters: 90,
        phaseCount: 3,
        nominalVoltage: 380,
        nominalCurrent: 30,
      },
    ],
  },
  {
    key: "paula",
    email: "paula@argilla.test",
    name: "Paula Medina",
    controllers: [
      { key: "linked", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
    ],
    kilns: [
      {
        name: "Horno principal de Paula",
        controllerKey: "linked",
        liters: 70,
        nominalCurrent: 28,
      },
      { name: "Horno pendiente de Paula", liters: 40, nominalCurrent: 20 },
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
    kilns: [
      {
        name: "Horno de Andrés",
        controllerKey: "linked",
        liters: 55,
        nominalCurrent: 22,
      },
    ],
  },
  {
    key: "elena",
    email: "elena@argilla.test",
    name: "Elena Muñoz",
    controllers: [
      { key: "kiln-a", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1" },
      { key: "kiln-b", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2" },
      {
        key: "kiln-c",
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3",
        switchType: "SSR",
      },
      { key: "spare", id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4" },
    ],
    kilns: [
      {
        name: "Horno esmalte Elena",
        controllerKey: "kiln-a",
        liters: 42,
        nominalCurrent: 18,
      },
      {
        name: "Horno esculturas Elena",
        controllerKey: "kiln-b",
        liters: 85,
        phaseCount: 3,
        nominalVoltage: 380,
        nominalCurrent: 30,
      },
      {
        name: "Horno laboratorio Elena",
        controllerKey: "kiln-c",
        liters: 25,
        nominalCurrent: 12,
      },
    ],
  },
];

const orphanControllers = [
  { id: "55555555-5555-4555-8555-555555555555", switchCurrentCapacity: 25 },
  {
    id: "66666666-6666-4666-8666-666666666666",
    switchType: "SSR",
    switchCurrentCapacity: 30,
  },
  { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", switchCurrentCapacity: 40 },
];

const orphanKilns = [
  {
    name: "Horno huérfano 1",
    liters: 30,
    nominalCurrent: 16,
  },
  {
    name: "Horno huérfano 2",
    liters: 70,
    phaseCount: 3,
    nominalVoltage: 380,
    nominalCurrent: 30,
  },
  { name: "Horno huérfano 3", liters: 45, nominalCurrent: 20 },
];

const kilnDefaults = {
  liters: 40,
  phaseCount: 1,
  nominalVoltage: 220,
  nominalCurrent: 20,
  manufacturer: "Argillá",
  heatingCircuitConfiguration: {
    type: "ROOT",
    connectionType: "PARALLEL",
    elements: [
      {
        type: "CHANNEL",
        name: "Canal principal",
        resistanceOhms: 18.5,
        lengthMeters: 6.2,
      },
    ],
  },
};

const programSelections = [
  ["maria", "Horno de María", "Bizcocho"],
  ["jose", "Horno gres de José", "Cono 6 (Gres)"],
  ["jose", "Horno esmaltes de José", "Cono 6"],
  ["ana", "Horno de Ana", "Quema de Prueba"],
  ["camila", "Horno mural de Camila", "Cono 7"],
  ["camila", "Horno joyería de Camila", "Bizcocho"],
  ["renata", "Horno pruebas de Renata", "Quema de Prueba"],
  ["renata", "Horno producción de Renata", "Cono 6 (Gres)"],
  ["felipe", "Horno bizcocho de Felipe", "Bizcocho"],
  ["felipe", "Horno rakú de Felipe", "Cono 6"],
  ["felipe", "Horno porcelana de Felipe", "Cono 7"],
  ["felipe", "Horno comunitario de Felipe", "Cono 6 (Gres)"],
  ["felipe", "Horno taller norte de Felipe", "Bizcocho"],
  ["paula", "Horno principal de Paula", "Cono 6"],
  ["paula", "Horno pendiente de Paula", "Quema de Prueba"],
  ["andres", "Horno de Andrés", "Cono 6 (Gres)"],
  ["elena", "Horno esmalte Elena", "Cono 6"],
  ["elena", "Horno esculturas Elena", "Cono 7"],
  ["elena", "Horno laboratorio Elena", "Quema de Prueba"],
];

const demoCycles = [
  {
    controllerCycleId: "seed-maria-bizcocho-completed-001",
    userKey: "maria",
    kilnName: "Horno de María",
    programName: "Bizcocho",
    status: "COMPLETED",
    startedAt: "2026-09-10T08:00:00.000Z",
    endedAt: "2026-09-10T14:40:00.000Z",
    telemetry: [
      [0, "INITIAL", 20, 20, false, 0, 220, 0, "2026-09-10T08:00:00.000Z"],
      [1, "PERIODIC", 348, 350, true, 1, 221, 19.8, "2026-09-10T10:30:00.000Z"],
      [2, "PERIODIC", 651, 650, true, 2, 219, 20.1, "2026-09-10T12:30:00.000Z"],
      [3, "FINAL", 948, 950, false, 4, 220, 0, "2026-09-10T14:40:00.000Z"],
    ],
  },
  {
    controllerCycleId: "seed-jose-gres-cancelled-001",
    userKey: "jose",
    kilnName: "Horno gres de José",
    programName: "Cono 6 (Gres)",
    status: "CANCELLED",
    statusReasonCode: "USER_CANCELLED",
    statusReason: "Quema cancelada por el usuario",
    startedAt: "2026-09-14T09:00:00.000Z",
    endedAt: "2026-09-14T11:10:00.000Z",
    telemetry: [
      [0, "INITIAL", 22, 20, false, 0, 220, 0, "2026-09-14T09:00:00.000Z"],
      [1, "PERIODIC", 176, 350, true, 1, 220, 24.5, "2026-09-14T10:00:00.000Z"],
      [2, "FINAL", 283, 350, false, 1, 220, 0, "2026-09-14T11:10:00.000Z"],
    ],
  },
  {
    controllerCycleId: "seed-renata-production-error-001",
    userKey: "renata",
    kilnName: "Horno producción de Renata",
    programName: "Cono 6 (Gres)",
    status: "ERROR",
    statusReasonCode: "SENSOR_FAULT",
    statusReason: "Lectura de termocupla fuera de rango",
    startedAt: "2026-09-18T07:30:00.000Z",
    endedAt: "2026-09-18T10:00:00.000Z",
    telemetry: [
      [0, "INITIAL", 19, 20, false, 0, 380, 0, "2026-09-18T07:30:00.000Z"],
      [1, "PERIODIC", 212, 350, true, 1, 381, 31.8, "2026-09-18T09:30:00.000Z"],
      [2, "FINAL", 205, 350, false, 1, 379, 0, "2026-09-18T10:00:00.000Z"],
    ],
  },
  {
    controllerCycleId: "seed-felipe-porcelain-unknown-001",
    userKey: "felipe",
    kilnName: "Horno porcelana de Felipe",
    programName: "Cono 7",
    status: "UNKNOWN",
    statusReasonCode: "FINAL_STATE_UNRECOVERABLE",
    statusReason: "No fue posible recuperar el estado final del controlador",
    startedAt: "2026-09-21T12:00:00.000Z",
    endedAt: "2026-09-21T16:20:00.000Z",
    telemetry: [
      [0, "INITIAL", 21, 10, false, 0, 220, 0, "2026-09-21T12:00:00.000Z"],
      [1, "PERIODIC", 412, 600, true, 2, 221, 24.7, "2026-09-21T16:00:00.000Z"],
    ],
  },
];

const demoTickets = [
  {
    key: "maria-open",
    userKey: "maria",
    kilnName: "Horno de María",
    reasonCode: "TEMPERATURE",
    title: "Temperatura inestable al comenzar",
    description:
      "La lectura oscila durante los primeros minutos antes de estabilizarse.",
    status: "OPEN",
    createdAt: "2026-09-22T13:00:00.000Z",
  },
  {
    key: "jose-in-progress",
    userKey: "jose",
    kilnName: "Horno gres de José",
    reasonCode: "CONTROLLER",
    title: "Controlador pierde conexión durante la quema",
    description:
      "El controlador se desconectó dos veces durante la última quema de gres.",
    status: "IN_PROGRESS",
    assignee: "technician",
    createdAt: "2026-09-20T15:30:00.000Z",
  },
  {
    key: "renata-resolved",
    userKey: "renata",
    kilnName: "Horno producción de Renata",
    reasonCode: "ELECTRICAL",
    title: "Corte intermitente del circuito de potencia",
    description:
      "El contactor deja de activar las resistencias de forma intermitente.",
    status: "RESOLVED",
    assignee: "technician",
    resolution:
      "Se reemplazó el contactor y se verificó el consumo en las tres fases.",
    createdAt: "2026-09-17T12:00:00.000Z",
  },
  {
    key: "felipe-closed",
    userKey: "felipe",
    kilnName: "Horno porcelana de Felipe",
    reasonCode: "FIRING_PROBLEM",
    title: "Quema finalizada sin confirmación",
    description:
      "La aplicación no pudo recuperar el estado final luego de una desconexión.",
    status: "CLOSED",
    assignee: "admin",
    resolution:
      "Se revisó el historial local y se recomendó actualizar el firmware.",
    createdAt: "2026-09-21T18:00:00.000Z",
  },
];

const demoMaintenanceRecords = [
  {
    ticketKey: "jose-in-progress",
    performer: "technician",
    type: "INSPECTION",
    title: "Inspección de conectividad",
    workPerformed:
      "Se revisaron alimentación, antena y nivel de señal del controlador.",
    performedAt: "2026-09-23T11:00:00.000Z",
  },
  {
    ticketKey: "renata-resolved",
    performer: "technician",
    type: "CORRECTIVE",
    title: "Reemplazo de contactor",
    workPerformed:
      "Se instaló un contactor nuevo y se verificó la corriente nominal.",
    performedAt: "2026-09-19T16:00:00.000Z",
  },
  {
    ticketKey: "felipe-closed",
    performer: "admin",
    type: "PREVENTIVE",
    title: "Actualización y prueba del controlador",
    workPerformed:
      "Se actualizó el firmware y se ejecutó una prueba de comunicación completa.",
    performedAt: "2026-09-22T10:30:00.000Z",
  },
];

async function seedGeographicCatalog() {
  const countriesByIsoCode = new Map();
  for (const country of COUNTRIES) {
    const stored = await prisma.country.upsert({
      where: { isoCode: country.code },
      update: { name: country.name },
      create: { isoCode: country.code, name: country.name },
    });
    countriesByIsoCode.set(stored.isoCode, stored);
  }

  const chile = countriesByIsoCode.get("CL");
  let defaultCommune = null;
  for (const region of CHILE_REGIONS) {
    const storedRegion = await prisma.region.upsert({
      where: {
        countryId_code: { countryId: chile.countryId, code: region.code },
      },
      update: { name: region.name },
      create: {
        countryId: chile.countryId,
        code: region.code,
        name: region.name,
      },
    });

    for (const commune of region.communes) {
      const storedCommune = await prisma.commune.upsert({
        where: { code: commune.code },
        update: { regionId: storedRegion.regionId, name: commune.name },
        create: {
          regionId: storedRegion.regionId,
          code: commune.code,
          name: commune.name,
        },
      });
      if (commune.code === "08101") defaultCommune = storedCommune;
    }
  }

  return { chile, defaultCommune };
}

async function createUserIfMissing({
  email,
  name,
  role,
  password,
  phone = null,
  countryId,
  communeId,
}) {
  const hashedPassword = await bcrypt.hash(password, PASSWORD_ROUNDS);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      passwordHash: hashedPassword,
      phone,
      countryId,
      communeId,
      isActive: true,
      anonymizedAt: null,
    },
    create: {
      email,
      name,
      role,
      phone,
      countryId,
      communeId,
      passwordHash: hashedPassword,
      isActive: true,
    },
  });
}

async function createControllerIfMissing(controllerId, data = {}) {
  const deviceSecretHash = await bcrypt.hash(
    `${seedDeviceSecret}:${controllerId}`,
    DEVICE_SECRET_ROUNDS,
  );
  const controller = await prisma.controller.findUnique({
    where: { controllerId },
  });

  if (controller) {
    return prisma.controller.update({
      where: { controllerId },
      data: {
        userId: data.userId ?? null,
        pairingPinHash: null,
        pairingPinExpiresAt: null,
        pairingFailedAttempts: 0,
        pairingBlockedUntil: null,
        switchType: data.switchType ?? "CONTACTOR",
        switchCurrentCapacity: data.switchCurrentCapacity ?? 25,
        deviceSecretHash,
        manufacturedAt:
          data.manufacturedAt ?? new Date("2025-01-15T12:00:00.000Z"),
        deliveredAt: data.deliveredAt ?? null,
        firmwareVersion: data.firmwareVersion ?? "DEMO-1.0.0",
      },
    });
  }

  return prisma.controller.create({
    data: {
      controllerId,
      userId: data.userId ?? null,
      deviceSecretHash,
      switchType: data.switchType ?? "CONTACTOR",
      switchCurrentCapacity: data.switchCurrentCapacity ?? 25,
      manufacturedAt:
        data.manufacturedAt ?? new Date("2025-01-15T12:00:00.000Z"),
      deliveredAt: data.deliveredAt ?? null,
      firmwareVersion: data.firmwareVersion ?? "DEMO-1.0.0",
    },
  });
}

async function createKilnIfMissing(name, data) {
  const kilnData = {
    userId: data.userId ?? null,
    controllerId: data.controllerId ?? null,
    liters: data.liters ?? kilnDefaults.liters,
    phaseCount: data.phaseCount ?? kilnDefaults.phaseCount,
    nominalVoltage: data.nominalVoltage ?? kilnDefaults.nominalVoltage,
    nominalCurrent: data.nominalCurrent ?? kilnDefaults.nominalCurrent,
    manufacturer: data.manufacturer ?? kilnDefaults.manufacturer,
    manufacturedAt: data.manufacturedAt ?? new Date("2024-11-01T12:00:00.000Z"),
    deliveredAt: data.deliveredAt ?? null,
    heatingCircuitConfiguration:
      data.heatingCircuitConfiguration ??
      kilnDefaults.heatingCircuitConfiguration,
  };
  const existing = await prisma.kiln.findFirst({
    where: { name, userId: kilnData.userId },
    orderBy: { kilnId: "asc" },
  });

  let controllerId = kilnData.controllerId;
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
        ...kilnData,
        name,
        userId: kilnData.userId,
        controllerId,
      },
    });
  }

  return prisma.kiln.create({
    data: {
      ...kilnDefaults,
      ...kilnData,
      name,
      userId: kilnData.userId,
      controllerId,
    },
  });
}

async function seedFiringCycle(definition, kiln, program) {
  const cycleData = {
    kilnId: kiln.kilnId,
    programId: program.programId,
    programConfig: program.configuration,
    startedAt: new Date(definition.startedAt),
    endedAt: new Date(definition.endedAt),
    status: definition.status,
    statusReasonCode: definition.statusReasonCode ?? null,
    statusReason: definition.statusReason ?? null,
  };
  const cycle = await prisma.firingCycle.upsert({
    where: { controllerCycleId: definition.controllerCycleId },
    update: cycleData,
    create: {
      controllerCycleId: definition.controllerCycleId,
      ...cycleData,
    },
  });

  for (const sample of definition.telemetry) {
    const [
      sampleSequence,
      sampleType,
      temperature,
      setpointTemperature,
      switchState,
      stageIndex,
      voltage,
      current,
      timestamp,
    ] = sample;
    const data = {
      sampleType,
      temperature,
      setpointTemperature,
      switchState,
      stageIndex,
      voltage,
      current,
      timestamp: new Date(timestamp),
    };
    await prisma.telemetry.upsert({
      where: {
        firingCycleId_sampleSequence: {
          firingCycleId: cycle.firingCycleId,
          sampleSequence,
        },
      },
      update: data,
      create: {
        firingCycleId: cycle.firingCycleId,
        sampleSequence,
        ...data,
      },
    });
  }
}

async function seedSupportTicket(definition, context) {
  const kiln = context.kilnsByUser
    .get(definition.userKey)
    ?.get(definition.kilnName);
  const creator = context.users[definition.userKey];
  const reason = context.reasonsByCode.get(definition.reasonCode);
  const assignee = definition.assignee
    ? context.staff[definition.assignee]
    : null;
  const data = {
    supportReasonId: reason.supportReasonId,
    createdByUserId: creator.userId,
    assignedToUserId: assignee?.userId ?? null,
    kilnId: kiln.kilnId,
    title: definition.title,
    description: definition.description,
    status: definition.status,
    resolution: definition.resolution ?? null,
    createdAt: new Date(definition.createdAt),
  };
  const existing = await prisma.supportTicket.findFirst({
    where: {
      createdByUserId: creator.userId,
      kilnId: kiln.kilnId,
      title: definition.title,
    },
    orderBy: { supportTicketId: "asc" },
  });

  if (existing) {
    return prisma.supportTicket.update({
      where: { supportTicketId: existing.supportTicketId },
      data,
    });
  }
  return prisma.supportTicket.create({ data });
}

async function seedMaintenanceRecord(definition, ticket, context) {
  const performer = context.staff[definition.performer];
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId: ticket.kilnId },
    select: { kilnId: true, controllerId: true },
  });
  const performedAt = new Date(definition.performedAt);
  const data = {
    kilnId: kiln.kilnId,
    controllerId: kiln.controllerId,
    performedByUserId: performer.userId,
    supportTicketId: ticket.supportTicketId,
    type: definition.type,
    title: definition.title,
    workPerformed: definition.workPerformed,
    performedAt,
  };
  const existing = await prisma.maintenanceRecord.findFirst({
    where: {
      supportTicketId: ticket.supportTicketId,
      title: definition.title,
      performedAt,
    },
    orderBy: { maintenanceId: "asc" },
  });

  if (existing) {
    return prisma.maintenanceRecord.update({
      where: { maintenanceId: existing.maintenanceId },
      data,
    });
  }
  return prisma.maintenanceRecord.create({ data });
}

async function main() {
  const { chile, defaultCommune } = await seedGeographicCatalog();

  await syncGlobalPrograms(prisma);
  const globalPrograms = await prisma.program.findMany({
    where: { userId: null },
  });
  const programsByName = new Map(
    globalPrograms.map((program) => [program.name, program]),
  );

  const reasonsByCode = new Map();
  for (const reason of supportReasons) {
    const storedReason = await prisma.supportReason.upsert({
      where: { code: reason.code },
      update: { name: reason.name, isActive: true },
      create: reason,
    });
    reasonsByCode.set(storedReason.code, storedReason);
  }

  const seededAdmin = await createUserIfMissing({
    email: admin.email,
    name: admin.name,
    password: admin.password,
    role: "ADMIN",
    countryId: chile.countryId,
    communeId: defaultCommune.communeId,
  });

  const seededTechnician = await createUserIfMissing({
    email: technician.email,
    name: technician.name,
    password: technician.password,
    role: "TECHNICIAN",
    phone: "+56955550101",
    countryId: chile.countryId,
    communeId: defaultCommune.communeId,
  });

  const seededUsers = {};
  for (const user of demoUsers) {
    seededUsers[user.key] = await createUserIfMissing({
      ...user,
      password: demoPassword,
      role: "CLIENT",
      countryId: chile.countryId,
      communeId: defaultCommune.communeId,
    });
  }

  const kilnsByUser = new Map();
  for (const user of demoUsers) {
    const userId = seededUsers[user.key].userId;
    const controllerByKey = {};
    const userKilns = new Map();
    kilnsByUser.set(user.key, userKilns);

    for (const controller of user.controllers) {
      await createControllerIfMissing(controller.id, {
        userId,
        switchType: controller.switchType,
        switchCurrentCapacity: controller.switchCurrentCapacity,
      });
      controllerByKey[controller.key] = controller.id;
    }

    for (const kiln of user.kilns) {
      const storedKiln = await createKilnIfMissing(kiln.name, {
        userId,
        controllerId: kiln.controllerKey
          ? controllerByKey[kiln.controllerKey]
          : null,
        liters: kiln.liters,
        phaseCount: kiln.phaseCount,
        nominalVoltage: kiln.nominalVoltage,
        nominalCurrent: kiln.nominalCurrent,
      });
      userKilns.set(storedKiln.name, storedKiln);
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
      switchCurrentCapacity: controller.switchCurrentCapacity,
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
    await createKilnIfMissing(kiln.name, {
      liters: kiln.liters,
      phaseCount: kiln.phaseCount,
      nominalVoltage: kiln.nominalVoltage,
      nominalCurrent: kiln.nominalCurrent,
    });
  }

  for (const [userKey, kilnName, programName] of programSelections) {
    const kiln = kilnsByUser.get(userKey).get(kilnName);
    const program = programsByName.get(programName);
    await prisma.kiln.update({
      where: { kilnId: kiln.kilnId },
      data: { selectedProgramId: program.programId },
    });
    kiln.selectedProgramId = program.programId;
  }

  for (const cycle of demoCycles) {
    await seedFiringCycle(
      cycle,
      kilnsByUser.get(cycle.userKey).get(cycle.kilnName),
      programsByName.get(cycle.programName),
    );
  }

  const context = {
    users: seededUsers,
    kilnsByUser,
    reasonsByCode,
    staff: { admin: seededAdmin, technician: seededTechnician },
  };
  const ticketsByKey = new Map();
  for (const ticketDefinition of demoTickets) {
    ticketsByKey.set(
      ticketDefinition.key,
      await seedSupportTicket(ticketDefinition, context),
    );
  }
  for (const maintenanceDefinition of demoMaintenanceRecords) {
    await seedMaintenanceRecord(
      maintenanceDefinition,
      ticketsByKey.get(maintenanceDefinition.ticketKey),
      context,
    );
  }

  console.log("[SEED] Seed aplicado exitosamente");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
