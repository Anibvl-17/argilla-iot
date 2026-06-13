import { Router } from "express";
import {
  loginUser,
  registerUser,
  logout,
} from "../controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  loginValidation,
  registerValidation,
} from "../validations/auth.validation.js";

const router = Router();

router.post("/login", validateSchema(loginValidation), loginUser);
router.post("/register", validateSchema(registerValidation), registerUser);
router.post("/logout", logout);

export default router;
