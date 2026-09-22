import { Router } from "express";
import authRoutes from "./auth.routes.js";
import kilnRoutes from "./kiln.routes.js";
import controllerRoutes from "./controller.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";
import catalogRoutes from "./catalog.routes.js";
import supportRoutes from "./support.routes.js";
import firingRoutes from "./firing.routes.js";

export function routerApi(app) {
  const router = Router();
  app.use("/api", router);

  router.use("/auth", authRoutes);
  router.use("/catalog", catalogRoutes);
  router.use("/kiln", kilnRoutes);
  router.use("/controller", controllerRoutes);
  router.use("/user", userRoutes);
  router.use("/admin", adminRoutes);
  router.use("/support", supportRoutes);
  router.use("/firing", firingRoutes);
}
