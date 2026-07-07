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
