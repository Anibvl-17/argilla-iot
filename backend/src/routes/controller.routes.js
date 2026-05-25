import { Router } from "express";
import {
  registerController, checkLinkStatus
} from "../controllers/controller.controller.js"

const router = Router();

router.get("/:macAddress/status", checkLinkStatus);
router.post("/register", registerController);

export default router;