import { Router } from "express";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/roles.constants.js";
import {
  editProfile,
  editUser,
  removeUser,
} from "../controllers/user.controller.js";

const router = Router();

router.use(authenticateJWT);

router.patch("/me", editProfile);

router.use(verifyRoles([ROLES.ADMIN]));

router.patch("/:userId", editUser);
router.delete("/:userId", removeUser);

export default router;
