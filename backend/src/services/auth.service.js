import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "./user.service.js";
import { presentUser } from "../utils/entityPresentation.js";

export async function login(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Credenciales incorrectas");
  }

  if (!user.isActive || user.anonymizedAt) {
    const error = new Error("La cuenta está desactivada");
    error.code = "ACCOUNT_INACTIVE";
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw new Error("Credenciales incorrectas");
  }

  const payload = {
    id: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" });

  return { user: presentUser(user), token };
}

export async function register(data) {
  return createUser({ ...data, role: "CLIENT" });
}
