// Use Übersicht's own WebSocket library and message bus. No separate server or
// npm installation. The server requires its HTTP origin on the WS handshake.
import { createRequire } from "node:module";
const require = createRequire("/Applications/Übersicht.app/Contents/Resources/server.js");
const WebSocket = require("ws");
const socket = new WebSocket("ws://127.0.0.1:41416", ["ws"], {
  origin: "http://127.0.0.1:41416",
});
const action = JSON.stringify({
  type: "WIDGET_WANTS_REFRESH",
  payload: "rift-bar-index-jsx",
});
const timeout = setTimeout(() => {
  socket.terminate();
  process.exitCode = 1;
}, 2000);

socket.on("open", () => socket.send(action));
socket.on("message", (data) => {
  // The server echoes its broadcast. Wait for acknowledgement before exiting.
  if (data.toString() === action) socket.close();
});
socket.on("close", () => clearTimeout(timeout));
socket.on("error", (error) => {
  clearTimeout(timeout);
  console.error("Cannot refresh rift-bar:", error.message);
  process.exitCode = 1;
});
