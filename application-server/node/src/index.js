import "dotenv/config.js";
import express from "express";
import cors from "cors";
import { SERVER_PORT } from "./config.js";
import { tokenController } from "./controllers/token.controller.js";
import { webhookController } from "./controllers/webhook.controller.js";
import { roomController } from "./controllers/room.controller.js";
import { egressController } from "./controllers/egress.controller.js";
import { ingressController } from "./controllers/ingress.controller.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/token", tokenController);
app.use("/livekit/webhook", webhookController);
app.use("/rooms", roomController);
app.use("/egresses", egressController);
app.use("/ingresses", ingressController);

app.listen(SERVER_PORT, () => {
    console.log("Server started on port:", SERVER_PORT);
});
