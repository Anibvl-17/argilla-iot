import { Router } from "express";
import {
  addKiln,
  editKiln,
  getAllKilns,
  getUserKilns,
  getUserKiln,
  getOwnedKilnTelemetryHistory,
  getAdminKiln,
  getAdminKilnTelemetryHistory,
  sendOwnedKilnControllerCommand,
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
  kilnControllerCommandValidation,
} from "../validations/kiln.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/my-kilns", getUserKilns);
router.get("/my-kilns/:kilnId", getUserKiln);
router.get("/my-kilns/:kilnId/telemetry", getOwnedKilnTelemetryHistory);
router.post(
  "/my-kilns/:kilnId/controller/command",
  validateSchema(kilnControllerCommandValidation),
  sendOwnedKilnControllerCommand,
);

router.post(
  "/:kilnId/link",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(linkControllerValidation),
  linkController,
);
router.post("/:kilnId/unlink", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), unlinkController);
router.patch("/:kilnId/release", verifyRoles([ROLES.ADMIN]), unlinkUser);

// CRUD
router.get("/all", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), getAllKilns);
router.get("/admin/:kilnId", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), getAdminKiln);
router.get("/admin/:kilnId/telemetry", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), getAdminKilnTelemetryHistory);
router.post("/create", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), validateSchema(createKilnValidation), addKiln);
router.patch("/:kilnId/edit", verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]), validateSchema(editKilnValidation), editKiln);
router.delete("/:kilnId/delete", verifyRoles([ROLES.ADMIN]), removeKiln);

// Vinculaciones
router.patch("/:kilnId/claim", verifyRoles([ROLES.ADMIN]), validateSchema(linkUserValidation), linkUser);

export default router;
