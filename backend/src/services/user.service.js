import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

export async function createUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.user.create({
    data: { email: data.email, password: hashedPassword },
  });

  return newUser;
}

export async function findUserByEmail(email) {
  return await prisma.user.findUnique({ where: { email } });
}
