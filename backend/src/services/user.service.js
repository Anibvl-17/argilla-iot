import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { ROLES } from "../constants/user.constants.js";
import { presentUser } from "../utils/entityPresentation.js";
import {
  normalizePhoneSearch,
  normalizeUserContactData,
} from "../utils/userContact.js";

const HASH_ROUNDS = 10;
const USER_LOCATION_INCLUDE = {
  country: true,
  commune: { select: { regionId: true } },
};

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function createUser(data, { allowIncompleteContact = false } = {}) {
  const passwordHash = await bcrypt.hash(data.password, HASH_ROUNDS);
  const contactData = allowIncompleteContact
    ? {
        phone: null,
        countryId: null,
        communeId: null,
        addressLine: null,
      }
    : await normalizeUserContactData(data, {}, prisma);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      ...contactData,
      role: data.role ?? ROLES.CLIENT,
    },
    include: USER_LOCATION_INCLUDE,
  });
  return presentUser(user);
}

export async function updateUser(userId, data) {
  const current = await prisma.user.findUnique({
    where: { userId },
    include: USER_LOCATION_INCLUDE,
  });
  if (!current) throw serviceError("P2025", "Usuario no encontrado");
  if (current.anonymizedAt) {
    throw serviceError("USER_ANONYMIZED", "Una cuenta anonimizada no puede modificarse");
  }
  if (current.role === ROLES.ADMIN && data.role && data.role !== ROLES.ADMIN) {
    const activeAdmins = await prisma.user.count({
      where: { role: ROLES.ADMIN, isActive: true, anonymizedAt: null },
    });
    if (activeAdmins <= 1) {
      throw serviceError("LAST_ACTIVE_ADMIN", "Debe permanecer al menos un administrador activo");
    }
  }

  const updateData = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.email !== undefined ? { email: data.email } : {}),
    ...(await normalizeUserContactData(data, current, prisma)),
    ...(data.role !== undefined ? { role: data.role } : {}),
  };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, HASH_ROUNDS);
  }
  return presentUser(
    await prisma.user.update({
      where: { userId },
      data: updateData,
      include: USER_LOCATION_INCLUDE,
    }),
  );
}

export async function setUserActive(userId, isActive, actingUserId) {
  if (userId === actingUserId && !isActive) {
    throw serviceError("SELF_DEACTIVATION", "No puedes desactivar tu propia cuenta");
  }
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { userId } });
    if (!user) throw serviceError("P2025", "Usuario no encontrado");
    if (user.anonymizedAt && isActive) {
      throw serviceError("USER_ANONYMIZED", "Una cuenta anonimizada no puede reactivarse");
    }
    if (user.role === ROLES.ADMIN && !isActive && user.isActive) {
      const activeAdmins = await tx.user.count({
        where: { role: ROLES.ADMIN, isActive: true, anonymizedAt: null },
      });
      if (activeAdmins <= 1) {
        throw serviceError("LAST_ACTIVE_ADMIN", "Debe permanecer al menos un administrador activo");
      }
    }
    return presentUser(
      await tx.user.update({
        where: { userId },
        data: { isActive },
        include: USER_LOCATION_INCLUDE,
      }),
    );
  });
}

export async function deactivateOwnUser(userId) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { userId } });
    if (!user) throw serviceError("P2025", "Usuario no encontrado");
    if (user.anonymizedAt) {
      throw serviceError("USER_ANONYMIZED", "La cuenta ya fue eliminada");
    }
    if (user.role === ROLES.ADMIN && user.isActive) {
      const activeAdmins = await tx.user.count({
        where: { role: ROLES.ADMIN, isActive: true, anonymizedAt: null },
      });
      if (activeAdmins <= 1) {
        throw serviceError(
          "LAST_ACTIVE_ADMIN",
          "Debe permanecer al menos un administrador activo",
        );
      }
    }
    return presentUser(
      await tx.user.update({
        where: { userId },
        data: { isActive: false },
        include: USER_LOCATION_INCLUDE,
      }),
    );
  });
}

async function redactRelatedText(tx, user, replacement) {
  const tokens = [user.name, user.email, user.phone, user.addressLine].filter(Boolean);
  for (const token of tokens) {
    await tx.$executeRaw`UPDATE "Kiln" SET "name" = replace("name", ${token}, ${replacement}) WHERE "userId" = ${user.userId}`;
    await tx.$executeRaw`UPDATE "Program" SET "name" = replace("name", ${token}, ${replacement}), "description" = CASE WHEN "description" IS NULL THEN NULL ELSE replace("description", ${token}, ${replacement}) END WHERE "userId" = ${user.userId}`;
    await tx.$executeRaw`UPDATE "SupportTicket" SET "title" = replace("title", ${token}, ${replacement}), "description" = replace("description", ${token}, ${replacement}), "resolution" = CASE WHEN "resolution" IS NULL THEN NULL ELSE replace("resolution", ${token}, ${replacement}) END WHERE "createdByUserId" = ${user.userId} OR "assignedToUserId" = ${user.userId} OR "kilnId" IN (SELECT "kilnId" FROM "Kiln" WHERE "userId" = ${user.userId})`;
    await tx.$executeRaw`UPDATE "MaintenanceRecord" SET "title" = replace("title", ${token}, ${replacement}), "workPerformed" = replace("workPerformed", ${token}, ${replacement}) WHERE "performedByUserId" = ${user.userId} OR "kilnId" IN (SELECT "kilnId" FROM "Kiln" WHERE "userId" = ${user.userId}) OR "controllerId" IN (SELECT "controllerId" FROM "Controller" WHERE "userId" = ${user.userId}) OR "supportTicketId" IN (SELECT "supportTicketId" FROM "SupportTicket" WHERE "createdByUserId" = ${user.userId})`;
  }
}

async function anonymizeUserRecord(userId) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { userId },
      include: USER_LOCATION_INCLUDE,
    });
    if (!user) throw serviceError("P2025", "Usuario no encontrado");
    if (user.anonymizedAt) return presentUser(user);
    if (user.role === ROLES.ADMIN && user.isActive) {
      const activeAdmins = await tx.user.count({
        where: { role: ROLES.ADMIN, isActive: true, anonymizedAt: null },
      });
      if (activeAdmins <= 1) {
        throw serviceError("LAST_ACTIVE_ADMIN", "Debe permanecer al menos un administrador activo");
      }
    }

    await redactRelatedText(tx, user, "[anonimizado]");
    const passwordHash = await bcrypt.hash(
      crypto.randomBytes(48).toString("base64url"),
      HASH_ROUNDS,
    );
    const updated = await tx.user.update({
      where: { userId },
      data: {
        email: `anonymous-${userId}@deleted.invalid`,
        name: `Usuario anonimizado ${userId}`,
        phone: null,
        countryId: null,
        communeId: null,
        addressLine: null,
        passwordHash,
        isActive: false,
        anonymizedAt: new Date(),
      },
      include: USER_LOCATION_INCLUDE,
    });
    return presentUser(updated);
  });
}

export async function anonymizeUser(userId, actingUserId) {
  if (userId === actingUserId) {
    throw serviceError("SELF_ANONYMIZATION", "No puedes anonimizar tu propia cuenta");
  }
  return anonymizeUserRecord(userId);
}

export function anonymizeOwnUser(userId) {
  return anonymizeUserRecord(userId);
}

export function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: USER_LOCATION_INCLUDE,
  });
}

export async function getUserProfile(userId) {
  return presentUser(
    await prisma.user.findUnique({
      where: { userId },
      include: USER_LOCATION_INCLUDE,
    }),
  );
}

export async function updateOwnProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { userId },
    include: USER_LOCATION_INCLUDE,
  });
  if (!user) throw serviceError("P2025", "Usuario no encontrado");
  const updateData = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(await normalizeUserContactData(data, user, prisma)),
  };
  if (data.newPassword) {
    const matches = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!matches) {
      throw serviceError("INVALID_CURRENT_PASSWORD", "La contraseña actual es incorrecta");
    }
    updateData.passwordHash = await bcrypt.hash(data.newPassword, HASH_ROUNDS);
  }
  return presentUser(
    await prisma.user.update({
      where: { userId },
      data: updateData,
      include: USER_LOCATION_INCLUDE,
    }),
  );
}

export async function getUsersPage({
  page = 1,
  pageSize = 10,
  search = "",
  roleFilter,
  statusFilter,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const normalizedPhoneSearch = normalizePhoneSearch(normalizedSearch);
  const numericSearch = Number(normalizedSearch);
  const normalizedRoleFilter = Object.values(ROLES).includes(roleFilter)
    ? roleFilter
    : undefined;
  const normalizedStatusFilter = ["ACTIVE", "INACTIVE"].includes(statusFilter)
    ? statusFilter
    : undefined;
  const filterWhere = {
    ...(normalizedRoleFilter ? { role: normalizedRoleFilter } : {}),
    ...(normalizedStatusFilter
      ? { isActive: normalizedStatusFilter === "ACTIVE" }
      : {}),
  };
  const where = {
    ...filterWhere,
    ...(normalizedSearch
      ? {
          OR: [
            ...(Number.isInteger(numericSearch) ? [{ userId: numericSearch }] : []),
            { name: { contains: normalizedSearch, mode: "insensitive" } },
            { email: { contains: normalizedSearch, mode: "insensitive" } },
            { phone: { contains: normalizedSearch, mode: "insensitive" } },
            ...(normalizedPhoneSearch && normalizedPhoneSearch !== normalizedSearch
              ? [{ phone: { contains: normalizedPhoneSearch } }]
              : []),
          ],
        }
      : {}),
  };
  const [items, total, scopeTotal] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { userId: "asc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
      include: USER_LOCATION_INCLUDE,
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: filterWhere }),
  ]);
  return {
    items: items.map(presentUser),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
    summary: { total: scopeTotal },
  };
}
