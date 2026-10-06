import { spawn } from "node:child_process";
import { constants } from "node:os";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node tools/quiet-command.mjs <command> [arguments...]");
  process.exitCode = 1;
} else {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  const output = [];
  let bytes = 0,
    truncated = false,
    launchError;
  const capture = (stream) => (chunk) => {
    output.push({ stream, chunk });
    bytes += chunk.length;
    while (bytes > 1048576 && output.length > 1) {
      bytes -= output.shift().chunk.length;
      truncated = true;
    }
  };
  child.stdout.on("data", capture(process.stdout));
  child.stderr.on("data", capture(process.stderr));
  child.once("error", (error) => {
    launchError = error;
  });
  const interrupt = () => child.kill("SIGINT");
  const terminate = () => child.kill("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  child.once("close", (code, signal) => {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
    if (code === 0 && !launchError && !signal) return;
    if (truncated) process.stderr.write("[Earlier command output truncated]\n");
    for (const { stream, chunk } of output) stream.write(chunk);
    if (launchError) process.stderr.write(`${command}: ${launchError.message}\n`);
    if (signal) process.stderr.write(`${command} terminated by ${signal}\n`);
    process.exitCode = signal
      ? 128 + (constants.signals[signal] || 0)
      : launchError
        ? 1
        : code || 1;
  });
}
