import express from "express";
import { createServer } from "node:http";
import morgan from "morgan";
import cors from "cors";
import { FRONTEND_URL, PORT } from "./config/configEnv.js";
import { routerApi } from "./routes/index.routes.js";
import { connectMqtt } from "./config/mqttClient.js";
import { initializeRealtime } from "./realtime/socket.js";

const app = express();
const server = createServer(app);
app.use(express.json());
app.use(morgan("dev"));

app.use(cors({ credentials: true, origin: FRONTEND_URL }));

app.get("/", (req, res) => {
  res.send("Hola mundo!");
});

routerApi(app);

initializeRealtime(server);
connectMqtt();

server.listen(PORT, () => {
  console.log(`=> Servidor corriendo en http://localhost:${PORT}`);
});
