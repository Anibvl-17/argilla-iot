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
import { ROLES } from "../constants/roles.constants.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  createKilnValidation,
  editKilnValidation,
  linkValidation,
} from "../validations/kiln.validation.js";

const router = Router();

router.use(authenticateJWT);

router.get("/my-kilns", getUserKilns);

router.post("/:kilnId/link", validateSchema(linkValidation), linkController);
router.post("/:kilnId/unlink", unlinkController);
router.post("/:kilnId/claim", validateSchema(linkValidation), linkUser);
router.post("/:kilnId/release", unlinkUser);

router.use(verifyRoles([ROLES.ADMIN]));

router.get("/all", getAllKilns);
router.post("/create", validateSchema(createKilnValidation), addKiln);
router.patch("/:kilnId/edit", validateSchema(editKilnValidation), editKiln);
router.delete("/:kilnId/delete", verifyRoles([ROLES.ADMIN]), removeKiln);

export default router;
