import { Router } from "express";
import {
  createController,
  editController,
  getAccessibleControllers,
  getAllControllers,
  removeController,
  linkUserToController,
} from "../controllers/controller.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/user.constants.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createControllerValidation,
  editControllerValidation,
  pairControllerValidation,
} from "../validations/controller.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get(
  "/accessible",
  verifyRoles([ROLES.ADMIN, ROLES.CLIENT]),
  getAccessibleControllers,
);

router.patch(
  "/claim",
  verifyRoles([ROLES.CLIENT]),
  validateSchema(pairControllerValidation),
  linkUserToController,
);

router.get(
  "/all",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  getAllControllers,
);
router.post(
  "/create",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(createControllerValidation),
  createController,
);
router.patch(
  "/:controllerId/edit",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(editControllerValidation),
  editController,
);
router.delete(
  "/:controllerId/delete",
  verifyRoles([ROLES.ADMIN]),
  removeController,
);

export default router;
