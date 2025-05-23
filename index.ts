import express from "express";
import mongoose from "mongoose";
import http from "http";
import { DB_URI } from "./src/config/index.js";
import { oauthRoute } from "./src/route/http.js";
import initWs from "./src/route/socket.js";

const app = express();
const server = http.createServer(app);

app.use("/oauth", oauthRoute);

const port = process.env.NODE_ENV === "production" ? 2100 : 2101;

app.use((_req: express.Request, res: express.Response) =>
  res.status(404).send("notfound")
);

server.listen(port, async () => {
  initWs(server);
  await mongoose.connect(DB_URI);

  console.log(
    `${process.env.NODE_ENV || "dev"} server(${port}) opened and connected db!`
  );
});
