import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "./user.service.js";

export async function login(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Credenciales incorrectas");
  }

  const isMatch = await bcrypt.compare(password, user.password);

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

  delete user.password;
  return { user, token };
}

export async function register(data) {
  // Evita el paso de rol al registrarse.
  const { name, email, password } = data;

  return createUser({ name, email, password });
}
