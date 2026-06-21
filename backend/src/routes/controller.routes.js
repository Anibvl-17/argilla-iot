import { Router } from "express";
import {
  createController,
  editController,
  generateControllerPin,
  getAllControllers,
  removeController,
} from "../controllers/controller.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/roles.constants.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createControllerValidation,
  editControllerValidation,
} from "../validations/controller.validation.js";

const router = Router();

router.patch("/:uuid/pin", generateControllerPin);

router.use(authenticateJWT, verifyRoles([ROLES.ADMIN]));

router.get("/all", getAllControllers);
router.post(
  "/create",
  validateSchema(createControllerValidation),
  createController,
);
router.patch(
  "/:controllerId",
  validateSchema(editControllerValidation),
  editController,
);
router.delete("/:controllerId", removeController);

export default router;
