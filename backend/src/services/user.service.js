import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { ROLES } from "../constants/user.constants.js";

export async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role ?? ROLES.USER,
    },
  });

  delete newUser.password;

  return newUser;
}

export async function updateUser(userId, data) {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { userId },
    data,
  });

  delete updatedUser.password;

  return updatedUser;
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
  return await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { userId } });

  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.code = "P2025";
    throw error;
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatches) {
    const error = new Error("La contraseña actual es incorrecta");
    error.code = "INVALID_CURRENT_PASSWORD";
    throw error;
  }

  const password = await bcrypt.hash(newPassword, 10);
  return await prisma.user.update({
    where: { userId },
    data: { password },
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function getAllUsers() {
  return await prisma.user.findMany({ omit: { password: true } });
}

export async function getUsersPage({ page = 1, pageSize = 10, search = "" } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const numericSearch = Number(normalizedSearch);
  const upperSearch = normalizedSearch.toUpperCase();
  const roleSearch = upperSearch.startsWith("ADMIN")
    ? ROLES.ADMIN
    : upperSearch.startsWith("USU") || upperSearch === ROLES.USER
      ? ROLES.USER
      : undefined;
  const where = normalizedSearch
    ? {
        OR: [
          ...(Number.isInteger(numericSearch) ? [{ userId: numericSearch }] : []),
          { name: { contains: normalizedSearch, mode: "insensitive" } },
          { email: { contains: normalizedSearch, mode: "insensitive" } },
          ...(roleSearch ? [{ role: roleSearch }] : []),
        ],
      }
    : {};

  const [items, total, scopeTotal] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      omit: { password: true },
      orderBy: { userId: "asc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.count(),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
    summary: { total: scopeTotal },
  };
}
