import express from "express";
import morgan from "morgan";
import { PORT } from "./config/configEnv.js";
import { routerApi } from "./routes/index.routes.js";

const app = express();
app.use(express.json());
app.use(morgan("dev"));

// TODO: configurar CORS para frontend

app.get("/", (req, res) => {
  res.send("Hola mundo!");
});

routerApi(app);

app.listen(PORT, () => {
  console.log(`=> Servidor corriendo en http://localhost:${PORT}`);
});
