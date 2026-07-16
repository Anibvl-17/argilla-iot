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
  renameOwnedKiln,
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
  unlinkUserValidation,
  renameUserKilnValidation,
} from "../validations/kiln.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/my-kilns", getUserKilns);
router.get("/my-kilns/:kilnId", getUserKiln);
router.get("/my-kilns/:kilnId/telemetry", getOwnedKilnTelemetryHistory);
router.patch(
  "/my-kilns/:kilnId/name",
  validateSchema(renameUserKilnValidation),
  renameOwnedKiln,
);
router.post(
  "/my-kilns/:kilnId/controller/command",
  validateSchema(kilnControllerCommandValidation),
  sendOwnedKilnControllerCommand,
);

router.use(verifyRoles([ROLES.ADMIN]));

router.post(
  "/:kilnId/link",
  validateSchema(linkControllerValidation),
  linkController,
);
router.post("/:kilnId/unlink", unlinkController);
router.patch(
  "/:kilnId/release",
  validateSchema(unlinkUserValidation),
  unlinkUser,
);

// CRUD
router.get("/all", getAllKilns);
router.get("/admin/:kilnId", getAdminKiln);
router.get("/admin/:kilnId/telemetry", getAdminKilnTelemetryHistory);
router.post("/create", validateSchema(createKilnValidation), addKiln);
router.patch("/:kilnId/edit", validateSchema(editKilnValidation), editKiln);
router.delete("/:kilnId/delete", verifyRoles([ROLES.ADMIN]), removeKiln);

// Vinculaciones
router.patch("/:kilnId/claim", validateSchema(linkUserValidation), linkUser);

export default router;
