import { Router } from "express";
import {
  addKiln,
  editKiln,
  getAllKilns,
  getUserKilns,
  getUserKiln,
  renameOwnedKiln,
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
  unlinkUserValidation,
  renameUserKilnValidation,
} from "../validations/kiln.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/my-kilns", getUserKilns);
router.get("/my-kilns/:kilnId", getUserKiln);
router.patch(
  "/my-kilns/:kilnId/name",
  validateSchema(renameUserKilnValidation),
  renameOwnedKiln,
);

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

router.use(verifyRoles([ROLES.ADMIN]));

// CRUD
router.get("/all", getAllKilns);
router.post("/create", validateSchema(createKilnValidation), addKiln);
router.patch("/:kilnId/edit", validateSchema(editKilnValidation), editKiln);
router.delete("/:kilnId/delete", verifyRoles([ROLES.ADMIN]), removeKiln);

// Vinculaciones
router.patch("/:kilnId/claim", validateSchema(linkUserValidation), linkUser);

export default router;
