import { Router } from "express";
import authRoutes from "./auth.routes.js";
import kilnRoutes from "./kiln.routes.js";
import controllerRoutes from "./controller.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";

export function routerApi(app) {
  const router = Router();
  app.use("/api", router);

  router.use("/auth", authRoutes);
  router.use("/kiln", kilnRoutes);
  router.use("/controller", controllerRoutes);
  router.use("/user", userRoutes);
  router.use("/admin", adminRoutes);
}
