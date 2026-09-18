import { Router } from "express";
import { getAdminSummary } from "../controllers/admin.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/user.constants.js";

const router = Router();

router.use(authenticateJWT, verifyRoles([ROLES.ADMIN]));
router.get("/summary", getAdminSummary);

export default router;
