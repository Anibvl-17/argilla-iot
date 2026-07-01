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

export async function getAllUsers() {
  return await prisma.user.findMany({ omit: { password: true } });
}
