import { Router } from "express";
import {
  createController,
  editController,
  generateControllerPin,
  getAllControllers,
  removeController,
  linkUserToController,
  unlinkUserFromController
} from "../controllers/controller.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/user.constants.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createControllerValidation,
  editControllerValidation,
  linkUserValidation,
  unlinkUserValidation,
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
  "/:controllerId/edit",
  validateSchema(editControllerValidation),
  editController,
);
router.delete("/:controllerId/delete", removeController);

router.patch(
  "/claim",
  validateSchema(linkUserValidation),
  linkUserToController,
);

router.patch(
  "/:controllerId/release",
  validateSchema(unlinkUserValidation),
  unlinkUserFromController,
);

export default router;
