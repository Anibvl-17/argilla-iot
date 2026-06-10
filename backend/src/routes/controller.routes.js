import { Router } from "express";
import {
  createController,
  generateControllerPin,
} from "../controllers/controller.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/roles.constants.js";

const router = Router();

router.patch("/:uuid/pin", generateControllerPin);

router.use(authenticateJWT);

router.post("/create", verifyRoles([ROLES.ADMIN]), createController);

export default router;
