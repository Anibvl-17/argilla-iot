import { Router } from "express";
import {
  createController,
  generateControllerPin,
} from "../controllers/controller.controller.js";

const router = Router();

router.patch("/:uuid/pin", generateControllerPin);
router.post("/create", createController);

export default router;
