import { Router } from "express";
import { getUserContactCatalog } from "../controllers/catalog.controller.js";

const router = Router();

router.get("/user-contact", getUserContactCatalog);

export default router;
