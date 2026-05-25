import { Router } from "express";
import {
  addKiln,
  getUserKilns,
  linkController,
} from "../controllers/kiln.controller.js";
import { authenticateJWT } from "../middlewares/authentication.middleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/all", getUserKilns);
router.post("/", addKiln);
router.post("/:kilnId/link", linkController);

export default router;
