import { Router } from "express";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/roles.constants.js";
import {
  addUser,
  editProfile,
  editUser,
  getAllUsers,
  removeUser,
} from "../controllers/user.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createUserValidation,
  updateProfileValidation,
  updateUserValidation,
} from "../validations/user.validation.js";

const router = Router();

router.use(authenticateJWT);

router.patch("/me", validateSchema(updateProfileValidation), editProfile);

router.use(verifyRoles([ROLES.ADMIN]));

router.get("/all", getAllUsers);
router.post("/create", validateSchema(createUserValidation), addUser);
router.patch("/:userId", validateSchema(updateUserValidation), editUser);
router.delete("/:userId", removeUser);

export default router;
