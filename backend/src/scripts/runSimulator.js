import { SimulatorService } from "../services/simulator.service.js";

const simulator = new SimulatorService();
let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  try {
    await simulator.stop();
    process.exit(0);
  } catch (error) {
    console.error("[SIM] Error al cerrar simulador:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

simulator.start().catch(async (error) => {
  console.error("[SIM] Error al iniciar simulador:", error.message);
  await shutdown();
});
