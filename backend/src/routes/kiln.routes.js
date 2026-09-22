import { Router } from "express";
import {
  addKiln,
  editKiln,
  getAllKilns,
  getUserKilns,
  getUserKiln,
  getOwnedKilnTelemetryHistory,
  getAdminKiln,
  getAdminKilnCycles,
  getAdminKilnCycleTelemetry,
  getAdminKilnTelemetryHistory,
  linkController,
  linkUser,
  removeKiln,
  unlinkController,
  unlinkUser,
} from "../controllers/kiln.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { ROLES } from "../constants/user.constants.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createKilnValidation,
  editKilnValidation,
  linkUserValidation,
  linkControllerValidation,
} from "../validations/kiln.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/my-kilns", verifyRoles([ROLES.CLIENT]), getUserKilns);
router.get("/my-kilns/:kilnId", verifyRoles([ROLES.CLIENT]), getUserKiln);
router.get(
  "/my-kilns/:kilnId/telemetry",
  verifyRoles([ROLES.CLIENT]),
  getOwnedKilnTelemetryHistory,
);
router.post(
  "/:kilnId/link",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(linkControllerValidation),
  linkController,
);
router.post("/:kilnId/unlink", verifyRoles([ROLES.ADMIN]), unlinkController);
router.patch("/:kilnId/release", verifyRoles([ROLES.ADMIN]), unlinkUser);

// CRUD
router.get("/all", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), getAllKilns);
router.get(
  "/admin/:kilnId",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  getAdminKiln,
);
router.get(
  "/admin/:kilnId/telemetry",
  verifyRoles([ROLES.ADMIN]),
  getAdminKilnTelemetryHistory,
);
router.get(
  "/admin/:kilnId/cycles",
  verifyRoles([ROLES.ADMIN]),
  getAdminKilnCycles,
);
router.get(
  "/admin/:kilnId/cycles/:firingCycleId/telemetry",
  verifyRoles([ROLES.ADMIN]),
  getAdminKilnCycleTelemetry,
);
router.post(
  "/create",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(createKilnValidation),
  addKiln,
);
router.patch(
  "/:kilnId/edit",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(editKilnValidation),
  editKiln,
);
router.delete("/:kilnId/delete", verifyRoles([ROLES.ADMIN]), removeKiln);

// Vinculaciones
router.patch(
  "/:kilnId/claim",
  verifyRoles([ROLES.ADMIN]),
  validateSchema(linkUserValidation),
  linkUser,
);

export default router;
