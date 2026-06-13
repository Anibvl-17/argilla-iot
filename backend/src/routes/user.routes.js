import { Router } from "express";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/roles.constants.js";
import {
  editProfile,
  editUser,
  removeUser,
} from "../controllers/user.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  updateProfileValidation,
  updateUserValidation,
} from "../validations/user.validation.js";

const router = Router();

router.use(authenticateJWT);

router.patch("/me", validateSchema(updateProfileValidation), editProfile);

router.use(verifyRoles([ROLES.ADMIN]));

router.patch("/:userId", validateSchema(updateUserValidation), editUser);
router.delete("/:userId", removeUser);

export default router;
