import { Router } from "express";
import {
  addKiln,
  getUserKilns,
  linkController,
  linkUser,
  unlinkController,
  unlinkUser
} from "../controllers/kiln.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/roles.constants.js";

const router = Router();

router.use(authenticateJWT);

router.get("/all", getUserKilns);
router.post("/", verifyRoles([ROLES.ADMIN]), addKiln);
router.post("/:kilnId/link", linkController);
router.post("/:kilnId/unlink", unlinkController);
router.post("/:kilnId/claim", linkUser);
router.post("/:kilnId/release", unlinkUser);

export default router;
