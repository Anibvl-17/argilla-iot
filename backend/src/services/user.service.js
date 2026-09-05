import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { ROLES } from "../constants/user.constants.js";
import {
  normalizeRole,
  presentUser,
} from "../utils/legacyCompatibility.js";

export async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      phone: data.phone,
      role: normalizeRole(data.role ?? ROLES.CLIENT),
    },
  });

  return presentUser(newUser);
}

export async function updateUser(userId, data) {
  const updateData = { ...data };

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }
  if (data.role) updateData.role = normalizeRole(data.role);

  const updatedUser = await prisma.user.update({
    where: { userId },
    data: updateData,
  });

  return presentUser(updatedUser);
}

export async function deleteUser(userId) {
  return await prisma.user.delete({ where: { userId } });
}

export async function findUserByEmail(email) {
  return await prisma.user.findUnique({ where: { email } });
}

export async function findUserById(userId) {
  return await prisma.user.findUnique({ where: { userId } });
}

export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      phone: true,
    },
  });

  return presentUser(user);
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { userId } });

  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.code = "P2025";
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );
  if (!passwordMatches) {
    const error = new Error("La contraseña actual es incorrecta");
    error.code = "INVALID_CURRENT_PASSWORD";
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updatedUser = await prisma.user.update({
    where: { userId },
    data: { passwordHash },
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      phone: true,
    },
  });

  return presentUser(updatedUser);
}

export async function getAllUsers() {
  const users = await prisma.user.findMany({ omit: { passwordHash: true } });
  return users.map(presentUser);
}

export async function getUsersPage({
  page = 1,
  pageSize = 10,
  search = "",
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const numericSearch = Number(normalizedSearch);
  const upperSearch = normalizedSearch.toUpperCase();
  const roleSearch = upperSearch.startsWith("ADMIN")
    ? ROLES.ADMIN
    : upperSearch.startsWith("TEC")
      ? ROLES.TECHNICIAN
      : upperSearch.startsWith("USU") ||
          upperSearch.startsWith("CLI") ||
          upperSearch === "USER"
        ? ROLES.CLIENT
        : undefined;
  const where = normalizedSearch
    ? {
        OR: [
          ...(Number.isInteger(numericSearch)
            ? [{ userId: numericSearch }]
            : []),
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { email: { contains: normalizedSearch, mode: "insensitive" } },
          ...(roleSearch ? [{ role: roleSearch }] : []),
        ],
      }
    : {};

  const [items, total, scopeTotal] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      omit: { passwordHash: true },
      orderBy: { userId: "asc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.count(),
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
