import { realpathSync } from "node:fs";
import { inspect } from "node:util";

const LOG_LIMIT = 32768;

function fileKey(data) {
  const file = data.entryFile || data.file || "<runner>";
  try {
    return realpathSync(file);
  } catch {
    return file;
  }
}

/** Node owns exit status; this reporter only selects failure diagnostics. */
export default async function* failuresOnly(events) {
  const logs = new Map();
  const failedFiles = new Set();
  let failures = 0;
  for await (const { type, data } of events) {
    const key = fileKey(data);
    if (type === "test:stdout" || type === "test:stderr") {
      if (failedFiles.has(key)) {
        yield data.message;
      } else {
        const old = logs.get(key) || { text: "", truncated: false };
        const text = old.text + data.message;
        logs.set(key, {
          text: text.slice(-LOG_LIMIT),
          truncated: old.truncated || text.length > LOG_LIMIT,
        });
      }
    } else if (type === "test:fail") {
      failures++;
      failedFiles.add(key);
      const log = logs.get(key);
      if (log) {
        if (log.truncated) yield "[Earlier test output truncated]\n";
        yield log.text;
        logs.delete(key);
      }
      yield `FAIL ${data.name}\n`;
      if (data.file) yield `${data.file}:${data.line || 1}:${data.column || 1}\n`;
      const error = data.details?.error;
      yield `${inspect(error?.cause instanceof Error ? error.cause : error, { colors: false, depth: 8 })}\n`;
    } else if (type === "test:summary") {
      if (data.file || data.entryFile) {
        if (data.success) logs.delete(key);
      } else if (!data.success) {
        // Do not hide a failed run even if a future Node version omits test:fail.
        if (!failures) {
          for (const log of logs.values()) yield log.text;
        }
        yield `Tests failed: ${data.counts.failed} failed, ${data.counts.cancelled} cancelled\n`;
      }
    }
  }
}
