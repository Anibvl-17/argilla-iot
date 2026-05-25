import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "./user.service.js";

export async function login(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Credenciales incorrectas");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Credenciales incorrectas");
  }
  
  const payload = { id: user.userId, email: user.email };
  const token = jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn: "2h" });
  console.log(payload);
  
  delete user.password;
  return { user, token };
}
