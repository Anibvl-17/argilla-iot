import { Router } from "express";
import {
  loginUser,
  registerUser,
  logout,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/logout", logout);

export default router;
