import { Router } from "express";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/user.constants.js";
import {
  addUser,
  changeUserStatus,
  deactivateProfile,
  deleteProfile,
  editProfile,
  editUser,
  getAllUsers,
  getProfile,
  removeUser,
} from "../controllers/user.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createUserValidation,
  updateProfileValidation,
  updateUserValidation,
  updateUserStatusValidation,
} from "../validations/user.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/me", getProfile);
router.patch("/me", validateSchema(updateProfileValidation), editProfile);
router.post("/me/deactivate", deactivateProfile);
router.delete("/me", deleteProfile);

router.get("/all", verifyRoles([ROLES.ADMIN]), getAllUsers);
router.use(verifyRoles([ROLES.ADMIN]));
router.post("/create", validateSchema(createUserValidation), addUser);
router.patch("/:userId/edit", validateSchema(updateUserValidation), editUser);
router.patch(
  "/:userId/status",
  validateSchema(updateUserStatusValidation),
  changeUserStatus,
);
router.delete("/:userId/delete", removeUser);

export default router;
