import { Router } from "express";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { ROLES } from "../constants/user.constants.js";
import {
  commandCycle,
  getContext,
  getCycles,
  getCycleTelemetry,
  getPrograms,
  selectProgram,
  startProgram,
} from "../controllers/firing.controller.js";
import {
  cycleCommandValidation,
  selectProgramValidation,
  startProgramValidation,
} from "../validations/firing.validation.js";

const router = Router();
router.use(authenticateJWT, verifyRoles([ROLES.CLIENT]));

router.get("/programs", getPrograms);
router.get("/kilns/:kilnId", getContext);
router.patch(
  "/kilns/:kilnId/selection",
  validateSchema(selectProgramValidation),
  selectProgram,
);
router.post(
  "/kilns/:kilnId/cycles/program",
  validateSchema(startProgramValidation),
  startProgram,
);
router.post(
  "/kilns/:kilnId/cycles/:firingCycleId/command",
  validateSchema(cycleCommandValidation),
  commandCycle,
);
router.get("/kilns/:kilnId/cycles", getCycles);
router.get("/kilns/:kilnId/cycles/:firingCycleId/telemetry", getCycleTelemetry);

export default router;
