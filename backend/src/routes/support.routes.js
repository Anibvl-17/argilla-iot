import { Router } from "express";
import {
  addMaintenance,
  addReason,
  addTicket,
  assignTicket,
  changeTicketStatus,
  claimTicket,
  editReason,
  getAssignees,
  getDiagnostics,
  getReasons,
  getTelemetry,
  getTicket,
  getTickets,
} from "../controllers/support.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";
import { verifyRoles } from "../middlewares/authorization.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { ROLES } from "../constants/user.constants.js";
import {
  assignSupportTicketValidation,
  createMaintenanceValidation,
  createSupportReasonValidation,
  createSupportTicketValidation,
  updateSupportReasonValidation,
  updateSupportTicketStatusValidation,
} from "../validations/support.validation.js";

const router = Router();
router.use(authenticateJWT);

router.get("/reasons", getReasons);
router.post(
  "/reasons",
  verifyRoles([ROLES.ADMIN]),
  validateSchema(createSupportReasonValidation),
  addReason,
);
router.patch(
  "/reasons/:reasonId",
  verifyRoles([ROLES.ADMIN]),
  validateSchema(updateSupportReasonValidation),
  editReason,
);
router.get("/assignees", verifyRoles([ROLES.ADMIN]), getAssignees);

router.get("/tickets", getTickets);
router.post(
  "/tickets",
  verifyRoles([ROLES.CLIENT]),
  validateSchema(createSupportTicketValidation),
  addTicket,
);
router.get("/tickets/:ticketId", getTicket);
router.patch(
  "/tickets/:ticketId/claim",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  claimTicket,
);
router.patch(
  "/tickets/:ticketId/assignment",
  verifyRoles([ROLES.ADMIN]),
  validateSchema(assignSupportTicketValidation),
  assignTicket,
);
router.patch(
  "/tickets/:ticketId/status",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(updateSupportTicketStatusValidation),
  changeTicketStatus,
);
router.get(
  "/tickets/:ticketId/diagnostics",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  getDiagnostics,
);
router.get(
  "/tickets/:ticketId/telemetry",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  getTelemetry,
);
router.post(
  "/tickets/:ticketId/maintenance",
  verifyRoles([ROLES.ADMIN, ROLES.TECHNICIAN]),
  validateSchema(createMaintenanceValidation),
  addMaintenance,
);

export default router;
