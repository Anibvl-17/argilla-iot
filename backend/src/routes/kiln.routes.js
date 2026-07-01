import { Router } from "express";
import {
  addKiln,
  editKiln,
  getAllKilns,
  getUserKilns,
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
} from "../validations/kiln.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/my-kilns", getUserKilns);

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
